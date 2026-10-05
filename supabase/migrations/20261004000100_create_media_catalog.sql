create table public.media (
  id uuid primary key default gen_random_uuid(),
  media_type text not null check (media_type in ('anime', 'movie', 'tv', 'book', 'manga')),
  title text not null,
  original_title text,
  synopsis text,
  release_year smallint check (release_year is null or release_year between 1900 and 2200),
  episode_count integer check (episode_count is null or episode_count >= 0),
  format text,
  content_rating text,
  review_status text not null default 'pending_review'
    check (review_status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_sources (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  provider text not null,
  provider_id text not null,
  source_url text not null,
  attribution_text text not null,
  source_snapshot jsonb not null,
  fetched_at timestamptz not null default now(),
  unique (provider, provider_id)
);

create table public.media_aliases (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  alias text not null,
  unique (media_id, alias)
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.media_genres (
  media_id uuid not null references public.media(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (media_id, genre_id)
);

create table public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.media_studios (
  media_id uuid not null references public.media(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  primary key (media_id, studio_id)
);

create table public.daily_puzzles (
  puzzle_date date primary key,
  media_id uuid not null references public.media(id),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'retired')),
  created_at timestamptz not null default now()
);

create index media_review_status_type_idx on public.media (review_status, media_type);
create index media_sources_media_id_idx on public.media_sources (media_id);
create index media_genres_genre_id_idx on public.media_genres (genre_id);
create index media_studios_studio_id_idx on public.media_studios (studio_id);
create index daily_puzzles_media_id_idx on public.daily_puzzles (media_id);

create or replace function public.upsert_jikan_anime(p_item jsonb)
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
  v_genre_id uuid;
  v_studio_id uuid;
begin
  if v_provider_id is null or p_item->>'title' is null then
    raise exception 'Jikan item is missing its provider id or title';
  end if;

  select ms.media_id, m.review_status into v_media_id, v_review_status
  from public.media_sources ms
  join public.media m on m.id = ms.media_id
  where ms.provider = 'jikan' and ms.provider_id = v_provider_id;

  if v_media_id is null then
    v_update_catalog := true;
    insert into public.media (
      media_type, title, original_title, synopsis, release_year,
      episode_count, format, content_rating
    ) values (
      'anime', p_item->>'title', p_item->>'original_title', p_item->>'synopsis',
      nullif(p_item->>'release_year', '')::smallint,
      nullif(p_item->>'episode_count', '')::integer,
      p_item->>'format', p_item->>'content_rating'
    ) returning id into v_media_id;
  else
    v_update_catalog := v_review_status = 'pending_review';
    if v_update_catalog then
      update public.media set
        title = p_item->>'title',
        original_title = p_item->>'original_title',
        synopsis = p_item->>'synopsis',
        release_year = nullif(p_item->>'release_year', '')::smallint,
        episode_count = nullif(p_item->>'episode_count', '')::integer,
        format = p_item->>'format',
        content_rating = p_item->>'content_rating',
        updated_at = now()
      where id = v_media_id;
    end if;
  end if;

  insert into public.media_sources (
    media_id, provider, provider_id, source_url, attribution_text, source_snapshot, fetched_at
  ) values (
    v_media_id, 'jikan', v_provider_id, p_item->>'source_url',
    p_item->>'attribution_text', p_item, now()
  )
  on conflict (provider, provider_id) do update set
    source_url = excluded.source_url,
    attribution_text = excluded.attribution_text,
    source_snapshot = excluded.source_snapshot,
    fetched_at = excluded.fetched_at;

  if v_update_catalog then
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

    delete from public.media_studios where media_id = v_media_id;
    for v_name in
      select distinct trim(studio_value)
      from jsonb_array_elements_text(coalesce(p_item->'studios', '[]'::jsonb)) as studios(studio_value)
      where length(trim(studio_value)) > 0
    loop
      insert into public.studios (name) values (v_name)
      on conflict (name) do update set name = excluded.name
      returning id into v_studio_id;
      insert into public.media_studios (media_id, studio_id)
      values (v_media_id, v_studio_id)
      on conflict do nothing;
    end loop;
  end if;

  return v_media_id;
end;
$$;

create or replace function public.upsert_jikan_anime_batch(p_items jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Jikan batch must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    perform public.upsert_jikan_anime(v_item);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

create or replace function public.require_approved_puzzle_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('scheduled', 'published') and not exists (
    select 1 from public.media m
    where m.id = new.media_id and m.review_status = 'approved'
  ) then
    raise exception 'Only approved media can be scheduled or published';
  end if;
  return new;
end;
$$;

create trigger daily_puzzles_require_approved_media
before insert or update of media_id, status on public.daily_puzzles
for each row execute function public.require_approved_puzzle_media();

alter table public.media enable row level security;
alter table public.media_sources enable row level security;
alter table public.media_aliases enable row level security;
alter table public.genres enable row level security;
alter table public.media_genres enable row level security;
alter table public.studios enable row level security;
alter table public.media_studios enable row level security;
alter table public.daily_puzzles enable row level security;

revoke all on public.media, public.media_sources, public.media_aliases, public.genres,
  public.media_genres, public.studios, public.media_studios, public.daily_puzzles
  from public, anon, authenticated;
grant all on public.media, public.media_sources, public.media_aliases, public.genres,
  public.media_genres, public.studios, public.media_studios, public.daily_puzzles
  to service_role;
revoke all on function public.upsert_jikan_anime(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_jikan_anime(jsonb) to service_role;
revoke all on function public.upsert_jikan_anime_batch(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_jikan_anime_batch(jsonb) to service_role;
