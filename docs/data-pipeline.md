# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The Tenrai adapter imports paged `/v1/top/anime` responses, and the TMDB adapter imports bounded movie pages into Supabase. In Supabase mode, anime and movies have independent daily assignments; the app must not call providers while a player loads or guesses.

Tenrai is a third-party API providing MyAnimeList-sourced metadata and is described by its maintainers as a Jikan v4 successor ([Tenrai project](https://github.com/Kareadita/tenrai.net), [Tenrai API](https://tenrai.org)). The project owner reports reviewing MyAnimeList's terms for the intended use. Tenrai records are automatically approved only when the synopsis is at least 80 characters, the record has at least four clue categories from genre, year, format, episode count, studio, and content rating, and the rating is not marked Rx/Hentai. Incomplete or explicitly adult-rated records remain out of daily selection. This is a data-quality/content-rating gate, not a human content-suitability review. Each record retains provider ID, MyAnimeList source URL, Tenrai attribution, retrieval time, and mapped snapshot. No images are imported.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `daily_puzzles`: the stable anime date-to-media schedule.
- `daily_movie_puzzles`: an independent stable movie date-to-media schedule. Its database function preserves an existing valid scheduled puzzle or atomically assigns one eligible movie for an unassigned UTC date, preferring movies not previously used.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. Apply migrations in filename order: `supabase/migrations/20261004000100_create_media_catalog.sql`, `supabase/migrations/20261006000100_add_tenrai_anime_import.sql`, `supabase/migrations/20261007000100_enable_daily_random_anime.sql`, `supabase/migrations/20261009000100_add_tmdb_movie_import.sql`, and `supabase/migrations/20261012000100_enable_daily_tmdb_movies.sql` (paste each into the project's Supabase SQL Editor in filename order if migrations are applied manually). The project owner reports that migrations through the TMDB importer have been applied; apply and verify the movie-game migration before enabling the movie game.
2. The project owner has reviewed MyAnimeList's terms for the intended use. Recheck the current Tenrai service limits and availability before large imports; the public API is an external dependency.
3. Run a small dry run first: `npm run import:tenrai`. It fetches one page, validates rows, reports counts, prints up to five usable mapped records for review, and makes no database writes.
4. After reviewing the preview, get explicit human approval before persisting a batch with `npm run import:tenrai -- --pages=4 --apply` (up to 100 pages / 2,500 source entries in this importer). If an approved batch stops partway through, resume with `--start-page=<next-page> --pages=<remaining-pages> --apply`; completed pages are not repeated. The initial approved top-100-page import completed with 2,296 usable records.
5. The importer automatically approves technically playable Tenrai rows; no title-by-title approval or manual daily scheduling is needed. Inspect `pending_review` rows and rejected records to monitor missing data, content suitability, title leakage, attribution, and source changes. Importing remains an explicit operator action with `--apply`; it is not a scheduled background sync.

### Import a TMDB movie batch

The importer requires `TMDB_API_KEY` in ignored `.env.local` and defaults to a one-page, no-write preview: `npm run import:tmdb`. It requests movie genres and top-rated movie pages, rejects records unless TMDB explicitly marks `adult: false`, and rejects overviews shorter than 80 characters. It imports no images; requests are capped at 10 pages per invocation. The latest 2026-10-12 no-write preview returned 20 fetched, 20 mapped, 0 rejected, and 0 written. The preview sample mappings were checked; the API key was not exposed. Review a fresh preview before any separately approved batch. Never run `--apply` without a reviewed preview and separate explicit batch approval.

TMDB records are staged as `pending_review`; importing does not approve a title or make it playable. A human must approve a movie after checking its synopsis/title and source. Reimports refresh provenance but do not overwrite approved canonical content. The service-role-only movie RPC selects only approved TMDB movies with an explicitly false adult flag in the source snapshot, a synopsis of at least 80 characters, a valid release year, at least one genre, and source data fetched within the last six calendar months. The separate movie game gives three guesses; its only progressive clues are TMDB genres and release year. Movie assignments use `daily_movie_puzzles` and a separate RPC; anime assignments and routes remain unchanged.

The public movie page includes an approved TMDB logo and the current required notice: “This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.” Content and game API responses are not cached. The six-month expiry is anchored to the original cached provider content and is not extended by provenance refreshes for approved records. Movie assignment and serving both reject expired content; the migration schedules `purge_expired_tmdb_movies()` hourly to delete it and its schedule. For a correction/removal request, immediately remove the affected title from play and invoke `purge_tmdb_movie('<provider-id>')`; review a fresh preview and record again only if permitted. If access ends, stop all TMDB use, disable/revoke its key in every environment, and invoke `purge_all_tmdb_movies()` promptly. These RPCs are service-role-only; never expose the Supabase secret or invoke purge against live data without owner approval. Commercial use requires a separate written agreement. Recheck the official [TMDB API terms](https://www.themoviedb.org/api-terms-of-use), [FAQ](https://developer.themoviedb.org/docs/faq), and [logo guidance](https://www.themoviedb.org/about/logos-attribution) before public rollout; the terms also prohibit TMDB content use in connection with an AI-based application.

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

**Next implementation priority: complete the TMDB movie vertical as a separate daily game.** The owner chose separate daily games per media type; movie titles must not enter the anime daily schedule. The latest read-only count check (2026-10-12) found 0 movie rows. The separate route, schedule, eligibility, attribution, and purge safeguards are implemented in the current branch but require migration, approved records, and preview verification before they can serve a game. Never run `--apply` without separate explicit batch approval. See [the source evaluation](./source-evaluation.md) and [next-chat handoff](../progress.md).

After TMDB, consider Google Books only for fields covered by explicit rights and provider terms; do not persist descriptions/covers by default. Wikidata is secondary metadata for a separate manga game, not a standalone clue source. AniList is excluded from persistent ingestion under its current terms. Add sources one at a time, review current terms, attribution, rate limits, and credentials, and give each its own eligibility policy and tests. Flag possible cross-provider matches for human review instead of fuzzy-merging adaptations or editions.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

The Supabase-backed game route assigns the date once and returns only the public, answer-free puzzle fields. Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

The game still defaults to its original sample puzzle. `GAME_DATA_SOURCE=supabase` is opt-in and requires the Supabase migrations and server-only credentials. Fullmetal Alchemist: Brotherhood remains explicitly scheduled for 2026-10-08; later dates are assigned on request after the daily-random migration is applied. Applying migrations and setting the Vercel production environment are separate deployment steps.
