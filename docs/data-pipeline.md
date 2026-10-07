# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The first adapter imports paged Tenrai `/v1/top/anime` responses into Supabase. The app serves a deliberately curated, reviewed daily puzzle from the database after the catalog is populated; it must not call Tenrai while a player loads or guesses.

Tenrai is a third-party API providing MyAnimeList-sourced metadata and is described by its maintainers as a Jikan v4 successor ([Tenrai project](https://github.com/Kareadita/tenrai.net), [Tenrai API](https://tenrai.org)). The project owner reports reviewing MyAnimeList's terms for the intended use. Records are still marked `pending_review` and require individual curation before approval or publication. The importer stores the provider ID, MyAnimeList source URL, Tenrai attribution, retrieval time, and mapped source snapshot for traceability. No images are imported.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `daily_puzzles`: a human-curated date-to-media schedule. Only approved media can be scheduled or published.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import, curate, schedule, or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. Apply the catalog migration and the follow-up Tenrai migration, `supabase/migrations/20261004000100_create_media_catalog.sql` and `supabase/migrations/20261006000100_add_tenrai_anime_import.sql`, to the Supabase project (paste each into the project's Supabase SQL Editor in filename order if migrations are applied manually).
2. The project owner has reviewed MyAnimeList's terms for the intended use. Recheck the current Tenrai service limits and availability before large imports; the public API is an external dependency.
3. Run a small dry run first: `npm run import:tenrai`. It fetches one page, validates rows, reports counts, prints up to five usable mapped records for review, and makes no database writes.
4. After reviewing the preview, get explicit human approval before persisting a batch with `npm run import:tenrai -- --pages=4 --apply` (up to 100 pages / 2,500 source entries in this importer). If an approved batch stops partway through, resume with `--start-page=<next-page> --pages=<remaining-pages> --apply`; completed pages are not repeated. The initial approved top-100-page import completed with 2,296 usable records.
5. Inspect `pending_review` rows for synopsis quality, unsuitable/adult content, duplicate records, title leakage, attribution, and clue quality. Approve only records cleared for use, then add selected media to `daily_puzzles` with a scheduled date. The database rejects scheduling or publishing unapproved media.

### Curate and schedule a puzzle

Use the Supabase Dashboard **SQL Editor** with an authorized project account; do not expose the service key. First inspect imported records and choose a specific record:

```sql
select m.id, m.title, m.release_year, m.content_rating, m.review_status,
       ms.provider_id, ms.source_url, m.synopsis
from public.media m
join public.media_sources ms on ms.media_id = m.id
where ms.provider = 'tenrai'
order by m.title;
```

After reviewing the selected row, replace `<media-id>` with its UUID and `YYYY-MM-DD` with the intended puzzle date, then run:

```sql
begin;

update public.media
set review_status = 'approved', updated_at = now()
where id = '<media-id>'::uuid
  and media_type = 'anime'
  and review_status = 'pending_review';

insert into public.daily_puzzles (puzzle_date, media_id, status)
select date 'YYYY-MM-DD', id, 'scheduled'
from public.media
where id = '<media-id>'::uuid
  and review_status = 'approved';

commit;
```

Check the SQL Editor's affected-row counts and verify the scheduled row afterward. The date is unique; an existing date causes the insert to fail rather than silently replace a puzzle. Approve and schedule records individually after review. `scheduled` does not itself enable database mode in the deployed game.

Imports are idempotent by `(provider, provider_id)`; Tenrai is recorded as the provider while the source URL retains the MyAnimeList record. The importer uses a conservative delay between source pages and retries transient failures. It is a manual operation in V1; do not schedule automatic refreshes until source limits and review workload are understood. Reimports save a new source snapshot. They do not overwrite already-approved canonical content; a human must review and apply changes. This gives us updates without silently changing a puzzle or approved record.

When adding TMDB or Google Books later, add a source adapter that maps its provider-specific response into these same typed tables. Keep one `media_sources` record per provider identity. If two providers appear to describe the same title, flag them for an explicit canonical-match decision instead of fuzzy-merging potentially different editions or adaptations.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

Once Supabase-backed serving is implemented, the public, answer-free daily puzzle response can use short CDN caching (for example, `s-maxage=300, stale-while-revalidate=3600`). Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

The current deployed-slice prototype still uses one original sample puzzle in code. The database migration and importer prepare the catalog; switching game reads to Supabase is a follow-up implementation after the schema is applied and some records are reviewed. Fullmetal Alchemist: Brotherhood is approved and scheduled for 2026-10-08 in the configured Supabase catalog; this does not enable database mode in the game.
