create table public.daily_book_puzzles (
  puzzle_date date primary key,
  media_id uuid not null references public.media(id),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'published', 'retired')),
  created_at timestamptz not null default now()
);

create index daily_book_puzzles_media_id_idx on public.daily_book_puzzles (media_id);

create or replace function public.require_approved_novel_puzzle_media()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('scheduled', 'published') and not exists (
    select 1
    from public.media m
    join public.media_book_details d on d.media_id = m.id
    where m.id = new.media_id
      and m.media_type = 'book'
      and m.format = 'novel'
      and m.review_status = 'approved'
      and length(trim(coalesce(m.synopsis, ''))) >= 80
      and exists (
        select 1 from public.media_genres mg where mg.media_id = m.id
      )
      and exists (
        select 1 from public.media_book_authors ma where ma.media_id = m.id
      )
      and exists (
        select 1 from public.media_sources s
        where s.media_id = m.id and s.provider = 'wikidata'
      )
  ) then
    raise exception 'Only approved playable Wikidata novels can be scheduled';
  end if;
  return new;
end;
$$;

create trigger daily_book_puzzles_require_approved_novel
before insert or update of media_id, status on public.daily_book_puzzles
for each row execute function public.require_approved_novel_puzzle_media();

create or replace function public.get_or_create_daily_wikidata_novel_puzzle(
  p_puzzle_date date
)
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('daily_wikidata_novel_puzzle'),
    pg_catalog.hashtext(p_puzzle_date::text)
  );

  select media_id, status
  into v_media_id, v_existing_status
  from public.daily_book_puzzles
  where puzzle_date = p_puzzle_date;

  if found then
    if v_existing_status not in ('scheduled', 'published') then
      raise exception 'Book puzzle date % is not scheduled', p_puzzle_date;
    end if;
    if not exists (
      select 1
      from public.media m
      join public.media_book_details d on d.media_id = m.id
      where m.id = v_media_id
        and m.media_type = 'book'
        and m.format = 'novel'
        and m.review_status = 'approved'
        and length(trim(coalesce(m.synopsis, ''))) >= 80
        and exists (select 1 from public.media_genres mg where mg.media_id = m.id)
        and exists (select 1 from public.media_book_authors ma where ma.media_id = m.id)
        and exists (
          select 1 from public.media_sources s
          where s.media_id = m.id and s.provider = 'wikidata'
        )
    ) then
      raise exception 'Scheduled book puzzle for % is no longer eligible', p_puzzle_date;
    end if;
    return v_media_id;
  end if;

  select m.id
  into v_media_id
  from public.media m
  join public.media_book_details d on d.media_id = m.id
  where m.media_type = 'book'
    and m.format = 'novel'
    and m.review_status = 'approved'
    and length(trim(coalesce(m.synopsis, ''))) >= 80
    and exists (select 1 from public.media_genres mg where mg.media_id = m.id)
    and exists (select 1 from public.media_book_authors ma where ma.media_id = m.id)
    and exists (
      select 1 from public.media_sources s
      where s.media_id = m.id and s.provider = 'wikidata'
    )
  order by
    case
      when exists (
        select 1 from public.daily_book_puzzles prior where prior.media_id = m.id
      ) then 1
      else 0
    end,
    random()
  limit 1;

  if v_media_id is null then
    raise exception 'No approved playable Wikidata novel is available for %', p_puzzle_date;
  end if;

  insert into public.daily_book_puzzles (puzzle_date, media_id, status)
  values (p_puzzle_date, v_media_id, 'scheduled');

  return v_media_id;
end;
$$;

alter table public.daily_book_puzzles enable row level security;
revoke all on public.daily_book_puzzles from public, anon, authenticated;
grant all on public.daily_book_puzzles to service_role;

revoke all on function public.require_approved_novel_puzzle_media()
  from public, anon, authenticated;
revoke all on function public.get_or_create_daily_wikidata_novel_puzzle(date)
  from public, anon, authenticated;
grant execute on function public.get_or_create_daily_wikidata_novel_puzzle(date)
  to service_role;
