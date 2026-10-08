create or replace function public.upsert_tenrai_anime(p_item jsonb)
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
    raise exception 'Tenrai item is missing its provider id or title';
  end if;

  select ms.media_id, m.review_status into v_media_id, v_review_status
  from public.media_sources ms
  join public.media m on m.id = ms.media_id
  where ms.provider = 'tenrai' and ms.provider_id = v_provider_id;

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
    v_media_id, 'tenrai', v_provider_id, p_item->>'source_url',
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

create or replace function public.upsert_tenrai_anime_batch(p_items jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Tenrai batch must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    perform public.upsert_tenrai_anime(v_item);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.upsert_tenrai_anime(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_tenrai_anime(jsonb) to service_role;
revoke all on function public.upsert_tenrai_anime_batch(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_tenrai_anime_batch(jsonb) to service_role;
