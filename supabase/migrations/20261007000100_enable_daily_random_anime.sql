create or replace function public.is_playable_anime(p_media_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.media m
    where m.id = p_media_id
      and m.media_type = 'anime'
      and nullif(pg_catalog.btrim(m.title), '') is not null
      and pg_catalog.length(pg_catalog.btrim(coalesce(m.synopsis, ''))) >= 80
      and pg_catalog.lower(coalesce(m.content_rating, '')) not like 'rx%'
      and pg_catalog.lower(coalesce(m.content_rating, '')) not like '%hentai%'
      and (
        case when exists (
          select 1
          from public.media_genres mg
          join public.genres g on g.id = mg.genre_id
          where mg.media_id = m.id
        ) then 1 else 0 end
        + case when m.release_year is not null then 1 else 0 end
        + case when nullif(pg_catalog.btrim(m.format), '') is not null then 1 else 0 end
        + case when m.episode_count > 0 then 1 else 0 end
        + case when exists (
          select 1
          from public.media_studios ms
          join public.studios s on s.id = ms.studio_id
          where ms.media_id = m.id
        ) then 1 else 0 end
        + case when nullif(pg_catalog.btrim(m.content_rating), '') is not null then 1 else 0 end
      ) >= 4
  );
$$;

revoke all on function public.is_playable_anime(uuid) from public, anon, authenticated;
grant execute on function public.is_playable_anime(uuid) to service_role;

update public.media m
set review_status = 'approved',
    updated_at = now()
where m.review_status = 'pending_review'
  and m.media_type = 'anime'
  and exists (
    select 1
    from public.media_sources ms
    where ms.media_id = m.id
      and ms.provider = 'tenrai'
  )
  and public.is_playable_anime(m.id);

create or replace function public.upsert_tenrai_anime_batch_and_approve(p_items jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item jsonb;
  v_media_id uuid;
  v_provider_id text;
  v_count integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Tenrai batch must be a JSON array';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value)
  loop
    perform public.upsert_tenrai_anime(v_item);
    v_provider_id := v_item->>'provider_id';

    select ms.media_id into v_media_id
    from public.media_sources ms
    where ms.provider = 'tenrai' and ms.provider_id = v_provider_id;

    if public.is_playable_anime(v_media_id) then
      update public.media
      set review_status = 'approved', updated_at = now()
      where id = v_media_id and review_status = 'pending_review';
    end if;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.upsert_tenrai_anime_batch_and_approve(jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_tenrai_anime_batch_and_approve(jsonb) to service_role;

create or replace function public.get_or_create_daily_anime_puzzle(p_puzzle_date date)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media_id uuid;
  v_existing_status text;
begin
  if p_puzzle_date is null then
    raise exception 'Puzzle date is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(742819450001::bigint);

  select dp.media_id, dp.status
  into v_media_id, v_existing_status
  from public.daily_puzzles dp
  where dp.puzzle_date = p_puzzle_date;

  if found then
    if v_existing_status in ('scheduled', 'published')
      and public.is_playable_anime(v_media_id)
      and exists (
        select 1 from public.media m
        where m.id = v_media_id
          and m.media_type = 'anime'
          and m.review_status = 'approved'
      )
    then
      return v_media_id;
    end if;

    raise exception 'Puzzle date % already has a non-playable or inactive row', p_puzzle_date;
  end if;

  select m.id
  into v_media_id
  from public.media m
  where m.media_type = 'anime'
    and m.review_status = 'approved'
    and public.is_playable_anime(m.id)
  order by
    case when exists (
      select 1
      from public.daily_puzzles dp
      where dp.media_id = m.id
    ) then 1 else 0 end,
    random()
  limit 1;

  if v_media_id is null then
    raise exception 'No approved playable anime is available for %', p_puzzle_date;
  end if;

  insert into public.daily_puzzles (puzzle_date, media_id, status)
  values (p_puzzle_date, v_media_id, 'scheduled');

  return v_media_id;
end;
$$;

revoke all on function public.get_or_create_daily_anime_puzzle(date) from public, anon, authenticated;
grant execute on function public.get_or_create_daily_anime_puzzle(date) to service_role;
