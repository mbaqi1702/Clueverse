create table public.book_authors (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null unique check (provider_id ~ '^Q[1-9][0-9]*$'),
  name text not null
);

create table public.media_book_authors (
  media_id uuid not null references public.media(id) on delete cascade,
  author_id uuid not null references public.book_authors(id) on delete cascade,
  author_order smallint not null check (author_order > 0),
  primary key (media_id, author_id),
  unique (media_id, author_order)
);

create table public.media_book_details (
  media_id uuid primary key references public.media(id) on delete cascade,
  first_publication_year smallint not null
    check (first_publication_year between 1 and 2200)
);

alter table public.book_authors enable row level security;
alter table public.media_book_authors enable row level security;
alter table public.media_book_details enable row level security;

revoke all on public.book_authors, public.media_book_authors, public.media_book_details
  from public, anon, authenticated;
grant all on public.book_authors, public.media_book_authors, public.media_book_details
  to service_role;

create or replace function public.upsert_wikidata_novel(p_item jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_media_id uuid;
  v_provider_id text := p_item->>'provider_id';
  v_review_status text;
  v_update_catalog boolean;
  v_name text;
  v_author_id uuid;
  v_author_order integer;
  v_author_provider_id text;
  v_valid_author_count integer;
  v_genre_id uuid;
begin
  if v_provider_id is null
    or v_provider_id !~ '^Q[1-9][0-9]*$'
    or nullif(trim(p_item->>'title'), '') is null
    or p_item->>'format' is distinct from 'novel'
    or nullif(p_item->>'source_url', '') is null
    or nullif(p_item->>'attribution_text', '') is null
  then
    raise exception 'Wikidata novel is missing required metadata';
  end if;
  if jsonb_typeof(p_item->'authors') is distinct from 'array'
    or jsonb_typeof(p_item->'genres') is distinct from 'array'
  then
    raise exception 'Wikidata novel is missing author or genre metadata';
  end if;
  if jsonb_array_length(p_item->'authors') = 0
    or jsonb_array_length(p_item->'genres') = 0
  then
    raise exception 'Wikidata novel is missing author or genre metadata';
  end if;
  select count(*) into v_valid_author_count
  from jsonb_array_elements(p_item->'authors') as author(value)
  where author.value->>'provider_id' ~ '^Q[1-9][0-9]*$'
    and length(trim(author.value->>'name')) > 0;
  if v_valid_author_count <> jsonb_array_length(p_item->'authors') then
    raise exception 'Wikidata novel has invalid author metadata';
  end if;
  if nullif(p_item->>'publication_year', '') is null
    or (p_item->>'publication_year')::integer not between 1 and 2200
  then
    raise exception 'Wikidata novel has an invalid publication year';
  end if;

  select ms.media_id, m.review_status into v_media_id, v_review_status
  from public.media_sources ms
  join public.media m on m.id = ms.media_id
  where ms.provider = 'wikidata' and ms.provider_id = v_provider_id;

  if v_media_id is null then
    v_update_catalog := true;
    insert into public.media (
      media_type, title, synopsis, release_year, format
    ) values (
      'book', p_item->>'title', null, null, 'novel'
    ) returning id into v_media_id;
  else
    if not exists (
      select 1 from public.media where id = v_media_id and media_type = 'book'
    ) then
      raise exception 'Wikidata item % is already linked to non-book media', v_provider_id;
    end if;
    v_update_catalog := v_review_status = 'pending_review';
    if v_update_catalog then
      update public.media
      set title = p_item->>'title', format = 'novel', updated_at = now()
      where id = v_media_id;
    end if;
  end if;

  insert into public.media_sources (
    media_id, provider, provider_id, source_url, attribution_text, source_snapshot, fetched_at
  ) values (
    v_media_id, 'wikidata', v_provider_id, p_item->>'source_url',
    p_item->>'attribution_text', p_item, now()
  )
  on conflict (provider, provider_id) do update set
    source_url = excluded.source_url,
    attribution_text = excluded.attribution_text,
    source_snapshot = excluded.source_snapshot,
    fetched_at = excluded.fetched_at;

  if v_update_catalog then
    insert into public.media_book_details (media_id, first_publication_year)
    values (v_media_id, (p_item->>'publication_year')::smallint)
    on conflict (media_id) do update set
      first_publication_year = excluded.first_publication_year;

    insert into public.media_aliases (media_id, alias)
    select v_media_id, alias_value
    from jsonb_array_elements_text(coalesce(p_item->'aliases', '[]'::jsonb)) as aliases(alias_value)
    where length(trim(alias_value)) > 0
    on conflict (media_id, alias) do nothing;

    delete from public.media_genres where media_id = v_media_id;
    for v_name in
      select distinct trim(genre_value)
      from jsonb_array_elements_text(coalesce(p_item->'genres', '[]'::jsonb)) as genres(genre_value)
      where length(trim(genre_value)) > 0
    loop
      insert into public.genres (name) values (v_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_genre_id;
      insert into public.media_genres (media_id, genre_id)
      values (v_media_id, v_genre_id)
      on conflict do nothing;
    end loop;

    delete from public.media_book_authors where media_id = v_media_id;
    for v_author_provider_id, v_name, v_author_order in
      select author.value->>'provider_id', trim(author.value->>'name'), author.author_order
      from jsonb_array_elements(coalesce(p_item->'authors', '[]'::jsonb))
        with ordinality as author(value, author_order)
      where author.value->>'provider_id' ~ '^Q[1-9][0-9]*$'
        and length(trim(author.value->>'name')) > 0
    loop
      insert into public.book_authors (provider_id, name)
      values (v_author_provider_id, v_name)
      on conflict (provider_id) do update set name = excluded.name
      returning id into v_author_id;
      insert into public.media_book_authors (media_id, author_id, author_order)
      values (v_media_id, v_author_id, v_author_order::smallint)
      on conflict (media_id, author_id) do update set author_order = excluded.author_order;
    end loop;
  end if;

  return v_media_id;
end;
$$;

create or replace function public.upsert_wikidata_novel_batch(p_items jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Wikidata novel batch must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    perform public.upsert_wikidata_novel(v_item);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.upsert_wikidata_novel(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_wikidata_novel(jsonb) to service_role;
revoke all on function public.upsert_wikidata_novel_batch(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_wikidata_novel_batch(jsonb) to service_role;
