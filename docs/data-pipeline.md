# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The Tenrai adapter imports paged anime records and the TMDB adapter imports bounded movie pages into Supabase. The app serves a deliberately curated, reviewed daily puzzle from the database after the catalog is populated; it must not call a provider while a player loads or guesses.

Tenrai is a third-party API providing MyAnimeList-sourced metadata and is described by its maintainers as a Jikan v4 successor ([Tenrai project](https://github.com/Kareadita/tenrai.net), [Tenrai API](https://tenrai.org)). The project owner reports reviewing MyAnimeList's terms for the intended use. Records are still marked `pending_review` and require individual curation before approval or publication. The importer stores the provider ID, MyAnimeList source URL, Tenrai attribution, retrieval time, and mapped source snapshot for traceability. No images are imported.

## Additional source discovery

Initial screening recommends TMDB movies as the first new adapter, Google Books as a field-scoped books candidate, and Wikidata as a secondary manga metadata source. AniList is excluded from persistent catalog ingestion under its current terms. The project owner authorized proceeding with the accepted candidates. See [the source evaluation](./source-evaluation.md) for screening results, constraints, and official references.

For each candidate, record:

- Coverage and fit for the proposed first media type.
- Current terms and permitted uses for each field, including display, retention, and redistribution; record unresolved licensing questions rather than assuming API access grants reuse rights.
- Required attribution, credentials, access approval, rate limits, availability, and operational cost.
- Useful canonical fields, mapping gaps, and any provider-specific data needed for clues.
- Known content-quality, duplicate, and update risks.

Proceed one source at a time, starting with TMDB movies. Use only the owner-authorized access and fields; preserve required attribution and retention/removal behavior. For all importers, keep dry-run as the default, require explicit `--apply` for database writes, and leave records pending human review. If permission for a field is unclear, exclude it or use original or independently licensed content.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `daily_puzzles`: a human-curated date-to-media schedule. Only approved media can be scheduled or published.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import, curate, schedule, or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. Apply the catalog migration and provider migrations, `supabase/migrations/20261004000100_create_media_catalog.sql`, `supabase/migrations/20261006000100_add_tenrai_anime_import.sql`, and `supabase/migrations/20261009000100_add_tmdb_movie_import.sql`, to the Supabase project in filename order (paste each into the project's Supabase SQL Editor in filename order if migrations are applied manually).
2. The project owner has reviewed MyAnimeList's terms for the intended use. Recheck the current Tenrai service limits and availability before large imports; the public API is an external dependency.
3. Run a small dry run first: `npm run import:tenrai`. It fetches one page, validates rows, reports counts, prints up to five usable mapped records for review, and makes no database writes.
4. After reviewing the preview, get explicit human approval before persisting a batch with `npm run import:tenrai -- --pages=4 --apply` (up to 100 pages / 2,500 source entries in this importer). If an approved batch stops partway through, resume with `--start-page=<next-page> --pages=<remaining-pages> --apply`; completed pages are not repeated. The initial approved top-100-page import completed with 2,296 usable records.
5. Inspect `pending_review` rows for synopsis quality, unsuitable/adult content, duplicate records, title leakage, attribution, and clue quality. Approve only records cleared for use, then add selected media to `daily_puzzles` with a scheduled date. The database rejects scheduling or publishing unapproved media.

### Import a TMDB movie batch

Set `TMDB_API_KEY` in `.env.local`; keep it server-side and never prefix it with `NEXT_PUBLIC_`. Run `npm run import:tmdb` for a one-page dry run. It checks the mapped preview and counts, makes no database writes, and omits adult records, image data, and synopses shorter than 80 characters. Requests are limited to at most 10 pages per invocation. After the TMDB migration is applied and the preview reviewed, a human-approved batch can be written with `npm run import:tmdb -- --pages=2 --apply`; `--start-page=<page>` resumes a bounded range.

The importer stores movie titles, original titles, overviews, release year, genre names, TMDB ID, source URL, and a mapped source snapshot as `pending_review`. The player never calls TMDB. Reimports update canonical fields only while a record is pending review; approved records retain their canonical content while source provenance is refreshed. Before public TMDB content is displayed, add the required logo and notice to the application and implement the provider's cache and termination/purge requirements.

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

After a source and intended use have been approved, add one source-specific adapter that maps permitted provider fields into these typed tables. Keep one `media_sources` record per provider identity. If two providers appear to describe the same title, flag them for an explicit canonical-match decision instead of fuzzy-merging potentially different editions or adaptations.

For anime title suggestions, query only approved, public-safe catalog titles through a bounded server-side prefix search. Keep the result count limited and avoid exposing pending-review records, provider calls, puzzle answers, aliases, or unrevealed clues through the suggestion response.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

Once Supabase-backed serving is implemented, the public, answer-free daily puzzle response can use short CDN caching (for example, `s-maxage=300, stale-while-revalidate=3600`). Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

The current deployed-slice prototype still uses one original sample puzzle in code. The database migration and importer prepare the catalog; switching game reads to Supabase is a follow-up implementation after the schema is applied and some records are reviewed. Fullmetal Alchemist: Brotherhood is approved and scheduled for 2026-10-08 in the configured Supabase catalog; this does not enable database mode in the game.
