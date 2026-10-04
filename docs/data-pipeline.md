# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The first adapter imports paged Jikan `/v4/top/anime` responses into Supabase. The app serves a deliberately curated, reviewed daily puzzle from the database after the catalog is populated; it must not call Jikan while a player loads or guesses.

Jikan describes itself as an unofficial API that scrapes MyAnimeList and says users are responsible for complying with MyAnimeList terms ([Jikan project](https://github.com/jikan-me/jikan-rest), [Jikan API docs](https://docs.api.jikan.moe/)). Imported records are marked `pending_review`; provider terms, attribution, synopsis reuse, and image rights must be reviewed before any external content is approved or published. The importer stores the provider ID, source URL, attribution note, retrieval time, and latest mapped source snapshot for traceability. No images are imported.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `daily_puzzles`: a human-curated date-to-media schedule. Only approved media can be scheduled or published.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import, curate, schedule, or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. Apply `supabase/migrations/20261004000100_create_media_catalog.sql` to the Supabase project (for the first pass, paste it into the project's Supabase SQL Editor).
2. Confirm the current Jikan and MyAnimeList terms, rate limits, attribution, synopsis reuse, and public-display permissions. Do not approve records until this human review is complete.
3. Run a small dry run first: `npm run import:jikan`. It fetches one page, validates rows, reports counts, and makes no database writes.
4. To persist the first page after review, run `npm run import:jikan -- --apply`. For a larger initial backfill, use an explicit page count, e.g. `npm run import:jikan -- --pages=40 --apply` (up to 1,000 source records at 25 per page).
5. Inspect `pending_review` rows for synopsis quality, unsuitable/adult content, duplicate records, title leakage, attribution, and clue quality. Approve only records cleared for use, then add selected media to `daily_puzzles` with a scheduled date. The database rejects scheduling or publishing unapproved media.

Imports are idempotent by `(provider, provider_id)`. The importer uses a conservative delay between source pages and retries transient failures. It is a manual operation in V1; do not schedule automatic refreshes until data rights, source limits, and review workload are understood. Reimports save a new source snapshot. They do not overwrite already-approved canonical content; a human must review and apply changes. This gives us updates without silently changing a puzzle or approved record.

When adding TMDB or Google Books later, add a source adapter that maps its provider-specific response into these same typed tables. Keep one `media_sources` record per provider identity. If two providers appear to describe the same title, flag them for an explicit canonical-match decision instead of fuzzy-merging potentially different editions or adaptations.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

Once Supabase-backed serving is implemented, the public, answer-free daily puzzle response can use short CDN caching (for example, `s-maxage=300, stale-while-revalidate=3600`). Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

The current deployed-slice prototype still uses one original sample puzzle in code. The database migration and importer prepare the catalog; switching game reads to Supabase is a follow-up implementation after the schema is applied and some records are reviewed.
