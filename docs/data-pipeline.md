# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The first adapter imports paged Tenrai `/v1/top/anime` responses into Supabase. In Supabase mode, the app persists one random assignment per UTC date from approved, playable anime; it must not call Tenrai while a player loads or guesses.

Tenrai is a third-party API providing MyAnimeList-sourced metadata and is described by its maintainers as a Jikan v4 successor ([Tenrai project](https://github.com/Kareadita/tenrai.net), [Tenrai API](https://tenrai.org)). The project owner reports reviewing MyAnimeList's terms for the intended use. Tenrai records are automatically approved only when the synopsis is at least 80 characters, the record has at least four clue categories from genre, year, format, episode count, studio, and content rating, and the rating is not marked Rx/Hentai. Incomplete or explicitly adult-rated records remain out of daily selection. This is a data-quality/content-rating gate, not a human content-suitability review. Each record retains provider ID, MyAnimeList source URL, Tenrai attribution, retrieval time, and mapped snapshot. No images are imported.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `daily_puzzles`: a stable date-to-media schedule. A database function preserves an existing valid scheduled puzzle or atomically assigns one eligible title for an unassigned UTC date, preferring titles not previously used.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. Apply migrations in filename order: `supabase/migrations/20261004000100_create_media_catalog.sql`, `supabase/migrations/20261006000100_add_tenrai_anime_import.sql`, and `supabase/migrations/20261007000100_enable_daily_random_anime.sql` (paste each into the project's Supabase SQL Editor in filename order if migrations are applied manually).
2. The project owner has reviewed MyAnimeList's terms for the intended use. Recheck the current Tenrai service limits and availability before large imports; the public API is an external dependency.
3. Run a small dry run first: `npm run import:tenrai`. It fetches one page, validates rows, reports counts, prints up to five usable mapped records for review, and makes no database writes.
4. After reviewing the preview, get explicit human approval before persisting a batch with `npm run import:tenrai -- --pages=4 --apply` (up to 100 pages / 2,500 source entries in this importer). If an approved batch stops partway through, resume with `--start-page=<next-page> --pages=<remaining-pages> --apply`; completed pages are not repeated. The initial approved top-100-page import completed with 2,296 usable records.
5. The importer automatically approves technically playable Tenrai rows; no title-by-title approval or manual daily scheduling is needed. Inspect `pending_review` rows and rejected records to monitor missing data, content suitability, title leakage, attribution, and source changes. Importing remains an explicit operator action with `--apply`; it is not a scheduled background sync.

### Inspect eligibility and daily assignments

Use the Supabase Dashboard **SQL Editor** with an authorized project account; do not expose the service key. Inspect imported records:

```sql
select m.id, m.title, m.release_year, m.content_rating, m.review_status,
       ms.provider_id, ms.source_url, m.synopsis
from public.media m
join public.media_sources ms on ms.media_id = m.id
where ms.provider = 'tenrai'
order by m.review_status, m.title;
```

The daily assignment RPC runs on the first Supabase-mode request for each UTC date. It preserves an existing valid scheduled or published row; otherwise, it selects an approved playable title, prefers one not previously used, and stores it as `scheduled`. A transaction-level advisory lock prevents concurrent requests from selecting the same unused title. Verify persisted assignments with:

```sql
select dp.puzzle_date, dp.status, m.title, m.review_status
from public.daily_puzzles dp
join public.media m on m.id = dp.media_id
order by dp.puzzle_date desc;
```

Imports are idempotent by `(provider, provider_id)`; Tenrai is recorded as the provider while the source URL retains the MyAnimeList record. The importer uses a conservative delay between source pages and retries transient failures. Importing is a manual operation; do not schedule automatic refreshes until source limits and operational needs are understood. Reimports save a new source snapshot and do not overwrite already-approved canonical content.

### Additional providers

No TMDB, Google Books, or other provider adapter is currently implemented. Add sources one at a time after reviewing that provider's current reuse terms, attribution requirements, rate limits, and any credential needs. Each adapter must map into the canonical tables and have focused validation/tests. The automatic Tenrai eligibility policy does not grant approval to another provider; each source needs its own explicit eligibility decision. Flag possible cross-provider matches for review instead of fuzzy-merging different editions or adaptations.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

The Supabase-backed game route assigns the date once and returns only the public, answer-free puzzle fields. Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

Production is configured with `GAME_DATA_SOURCE=supabase`; local development defaults to the original sample puzzle. The project owner reports applying the daily-random migration to the configured Supabase project. Vercel Production has the required Supabase URL/secret and data-source setting, and the live API has been verified to serve a database-backed puzzle without its answer or unrevealed clues. Fullmetal Alchemist: Brotherhood is explicitly scheduled for 2026-10-08 UTC. Subsequent daily assignments are created and persisted on the first request for that UTC date. At UTC+3, each date changes at 03:00 local time. See [next steps / handoff](./next-steps.md) for post-launch checks and follow-up priorities.
