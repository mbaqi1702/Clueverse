alter table public.media
  add constraint media_movie_format_check
  check (media_type <> 'movie' or format = 'movie');

alter table public.media_sources
  add column tmdb_content_expires_at timestamptz;

create or replace function public.set_tmdb_content_expiry()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_review_status text;
begin
  if new.provider <> 'tmdb' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.tmdb_content_expires_at := now() + interval '6 months';
    return new;
  end if;

  select m.review_status into v_review_status
  from public.media m
  where m.id = new.media_id;

  if v_review_status = 'pending_review' then
    new.tmdb_content_expires_at := now() + interval '6 months';
  else
    new.tmdb_content_expires_at := old.tmdb_content_expires_at;
  end if;
  return new;
end;
$$;

revoke all on function public.set_tmdb_content_expiry() from public, anon, authenticated;

create trigger media_sources_set_tmdb_content_expiry
before insert or update on public.media_sources
for each row execute function public.set_tmdb_content_expiry();

create table public.daily_movie_puzzles (
  puzzle_date date primary key,
  media_id uuid not null references public.media(id),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'retired')),
  created_at timestamptz not null default now()
);

create index daily_movie_puzzles_media_id_idx on public.daily_movie_puzzles (media_id);
alter table public.daily_movie_puzzles enable row level security;
revoke all on public.daily_movie_puzzles from public, anon, authenticated;

create or replace function public.is_playable_tmdb_movie(p_media_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.media m
    join public.media_sources ms on ms.media_id = m.id
    where m.id = p_media_id
      and m.media_type = 'movie'
      and m.review_status = 'approved'
      and m.format = 'movie'
      and nullif(pg_catalog.btrim(m.title), '') is not null
      and pg_catalog.length(pg_catalog.btrim(coalesce(m.synopsis, ''))) >= 80
      and m.release_year between 1900 and 2200
      and ms.provider = 'tmdb'
      and ms.source_snapshot->>'adult' = 'false'
      and ms.tmdb_content_expires_at > now()
      and exists (
        select 1
        from public.media_genres mg
        where mg.media_id = m.id
      )
  );
$$;

revoke all on function public.is_playable_tmdb_movie(uuid) from public, anon, authenticated;
grant execute on function public.is_playable_tmdb_movie(uuid) to service_role;

create or replace function public.require_approved_daily_movie()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('scheduled', 'published') and not exists (
    select 1
    from public.media m
    where m.id = new.media_id
      and m.media_type = 'movie'
      and m.review_status = 'approved'
      and public.is_playable_tmdb_movie(m.id)
  ) then
    raise exception 'Only approved, playable TMDB movies can be scheduled';
  end if;
  return new;
end;
$$;

create trigger daily_movie_puzzles_require_approved_media
before insert or update of media_id, status on public.daily_movie_puzzles
for each row execute function public.require_approved_daily_movie();

create or replace function public.get_or_create_daily_tmdb_movie_puzzle(p_puzzle_date date)
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

  perform pg_catalog.pg_advisory_xact_lock(742819450002::bigint);

  select dp.media_id, dp.status
  into v_media_id, v_existing_status
  from public.daily_movie_puzzles dp
  where dp.puzzle_date = p_puzzle_date;

  if found then
    if v_existing_status in ('scheduled', 'published')
      and public.is_playable_tmdb_movie(v_media_id)
    then
      return v_media_id;
    end if;
    raise exception 'Movie puzzle date % already has a non-playable or inactive row', p_puzzle_date;
  end if;

  select m.id
  into v_media_id
  from public.media m
  where m.media_type = 'movie'
    and m.review_status = 'approved'
    and public.is_playable_tmdb_movie(m.id)
  order by
    case when exists (
      select 1
      from public.daily_movie_puzzles dp
      where dp.media_id = m.id
    ) then 1 else 0 end,
    random()
  limit 1;

  if v_media_id is null then
    raise exception 'No approved, playable TMDB movie is available for %', p_puzzle_date;
  end if;

  insert into public.daily_movie_puzzles (puzzle_date, media_id, status)
  values (p_puzzle_date, v_media_id, 'scheduled');

  return v_media_id;
end;
$$;

revoke all on function public.get_or_create_daily_tmdb_movie_puzzle(date)
  from public, anon, authenticated;
grant execute on function public.get_or_create_daily_tmdb_movie_puzzle(date) to service_role;

create or replace function public.purge_tmdb_movie(p_provider_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media_id uuid;
begin
  if nullif(pg_catalog.btrim(p_provider_id), '') is null then
    raise exception 'TMDB provider id is required';
  end if;

  select ms.media_id
  into v_media_id
  from public.media_sources ms
  where ms.provider = 'tmdb'
    and ms.provider_id = p_provider_id;

  if v_media_id is null then
    return false;
  end if;

  if exists (
    select 1 from public.media_sources ms
    where ms.media_id = v_media_id and ms.provider <> 'tmdb'
  ) then
    raise exception 'Cross-provider movie % requires manual review before purge', p_provider_id;
  end if;

  delete from public.daily_movie_puzzles where media_id = v_media_id;
  delete from public.daily_puzzles where media_id = v_media_id;
  delete from public.genres g
  where exists (
    select 1 from public.media_genres mg
    where mg.media_id = v_media_id and mg.genre_id = g.id
  )
    and not exists (
      select 1 from public.media_genres mg
      where mg.genre_id = g.id and mg.media_id <> v_media_id
    );
  delete from public.media where id = v_media_id and media_type = 'movie';
  return true;
end;
$$;

revoke all on function public.purge_tmdb_movie(text) from public, anon, authenticated;
grant execute on function public.purge_tmdb_movie(text) to service_role;

create or replace function public.purge_expired_tmdb_movies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_id text;
  v_purged integer := 0;
begin
  for v_provider_id in
    select ms.provider_id
    from public.media_sources ms
    join public.media m on m.id = ms.media_id
    where ms.provider = 'tmdb'
      and m.media_type = 'movie'
      and ms.tmdb_content_expires_at <= now()
  loop
    if public.purge_tmdb_movie(v_provider_id) then
      v_purged := v_purged + 1;
    end if;
  end loop;

  return v_purged;
end;
$$;

revoke all on function public.purge_expired_tmdb_movies() from public, anon, authenticated;
grant execute on function public.purge_expired_tmdb_movies() to service_role;

create or replace function public.purge_all_tmdb_movies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_provider_id text;
  v_purged integer := 0;
begin
  for v_provider_id in
    select ms.provider_id from public.media_sources ms where ms.provider = 'tmdb'
  loop
    if public.purge_tmdb_movie(v_provider_id) then
      v_purged := v_purged + 1;
    end if;
  end loop;

  return v_purged;
end;
$$;

revoke all on function public.purge_all_tmdb_movies() from public, anon, authenticated;
grant execute on function public.purge_all_tmdb_movies() to service_role;

create extension if not exists pg_cron;

select cron.schedule(
  'purge-expired-tmdb-movies',
  '0 * * * *',
  'select public.purge_expired_tmdb_movies();'
);
