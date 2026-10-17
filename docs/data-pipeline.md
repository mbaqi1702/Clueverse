# Anime data pipeline

## Decision

External providers are ingestion sources, not dependencies in the player request path. The Tenrai adapter imports paged `/v1/top/anime` responses, the TMDB adapter imports bounded movie pages, and a Wikidata adapter stages explicitly typed English-language novel metadata in Supabase. In Supabase mode, anime, movies, and books have independent daily assignments; the app must not call providers while a player loads or guesses. The separate `/books` game supports an original fictional sample in sample mode and database-backed daily puzzles in Supabase mode.

Tenrai is a third-party API providing MyAnimeList-sourced metadata and is described by its maintainers as a Jikan v4 successor ([Tenrai project](https://github.com/Kareadita/tenrai.net), [Tenrai API](https://tenrai.org)). The project owner reports reviewing MyAnimeList's terms for the intended use. Tenrai records are automatically approved only when the synopsis is at least 80 characters, the record has at least four clue categories from genre, year, format, episode count, studio, and content rating, and the rating is not marked Rx/Hentai. Incomplete or explicitly adult-rated records remain out of daily selection. This is a data-quality/content-rating gate, not a human content-suitability review. Each record retains provider ID, MyAnimeList source URL, Tenrai attribution, retrieval time, and mapped snapshot. No images are imported.

Wikidata's structured data is CC0. The Books pilot uses the MediaWiki entity search/API, not descriptions, summaries, page text, or book files. It maps only works directly typed as novels with an English label, at least one linked author, one linked genre, and a usable publication year. Search is bounded to one query and at most 20 candidates; requests identify ClueVerse, are spaced apart, and stop immediately on HTTP 429. Newly imported records remain `pending_review` with no synopsis; only records with original clue copy and editorial approval can be scheduled. The source's CC0 status does not establish the rights to reproduce the underlying book text, which this integration never requests.

## Storage model

- `media`: canonical, typed fields used by the game (title, synopsis, year, episode count, format, and content rating). Media types leave room for later verticals.
- `media_sources`: provider IDs and provenance; its JSON snapshot retains the latest mapped provider record for review, not as the query model.
- `media_aliases`, `genres`, `media_genres`, `studios`, `media_studios`: queryable title aliases and clue attributes.
- `book_authors`, `media_book_authors`, `media_book_details`: normalized authors and first-publication year for staged novel records.
- `daily_puzzles`: the stable anime date-to-media schedule.
- `daily_movie_puzzles`: an independent stable movie date-to-media schedule. Its database function preserves an existing valid scheduled puzzle or atomically assigns one eligible movie for an unassigned UTC date, preferring movies not previously used.

Row-level security is enabled with no browser-facing policies. Only a server/operator using the Supabase secret key can import or read protected catalog rows. Never put that key in `NEXT_PUBLIC_*`.

## Import lifecycle

1. The Books migrations `20261016000100_add_wikidata_novel_import.sql` and `20261016000200_enable_daily_wikidata_novels.sql` are applied individually to the configured project. The project has no migration ledger; do not use `supabase db push` until its existing migration baseline is reconciled. For other environments, apply the repository migrations in filename order and verify tables, functions, triggers, and jobs before production use.
2. The project owner has reviewed MyAnimeList's terms for the intended use. Recheck the current Tenrai service limits and availability before large imports; the public API is an external dependency.
3. Run a small dry run first: `npm run import:tenrai`. It fetches one page, validates rows, reports counts, prints up to five usable mapped records for review, and makes no database writes.
4. After reviewing the preview, get explicit human approval before persisting a batch with `npm run import:tenrai -- --pages=4 --apply` (up to 100 pages / 2,500 source entries in this importer). If an approved batch stops partway through, resume with `--start-page=<next-page> --pages=<remaining-pages> --apply`; completed pages are not repeated. The initial approved top-100-page import completed with 2,296 usable records.
5. The importer automatically approves technically playable Tenrai rows; no title-by-title approval or manual daily scheduling is needed. Inspect `pending_review` rows and rejected records to monitor missing data, content suitability, title leakage, attribution, and source changes. Importing remains an explicit operator action with `--apply`; it is not a scheduled background sync.

### Import a TMDB movie batch

The owner cleared TMDB for the intended non-AI-powered ClueVerse game; this does not waive provider terms or replace separate approval for database writes. The importer requires `TMDB_API_KEY` in ignored `.env.local` and defaults to a one-page, no-write preview: `npm run import:tmdb`. It requests movie genres and top-rated movie pages, rejects records unless TMDB explicitly marks `adult: false`, rejects overviews shorter than 80 characters, and requires a valid release year plus at least one known genre for the game's clue set. It imports no images; requests are capped at 10 pages per invocation. The fresh 2026-10-13 no-write preview returned 20 fetched, 20 usable, 0 rejected, and 0 written. Review the preview before any separately approved batch. Never run `--apply` without explicit approval for the reviewed batch.

TMDB records are staged as `pending_review`; importing does not approve a title or make it playable. A human must approve a movie after checking its synopsis/title and source. Reimports refresh provenance but do not overwrite approved canonical content. The service-role-only movie RPC selects only approved TMDB movies with an explicitly false adult flag in the source snapshot, a synopsis of at least 80 characters, a valid release year, at least one genre, and source data fetched within the last six calendar months. The separate movie game gives three guesses; its only progressive clues are TMDB genres and release year. Movie assignments use `daily_movie_puzzles` and a separate RPC; anime assignments and routes remain unchanged.

The movie page requires `GAME_DATA_SOURCE=supabase` in the relevant Vercel environment, plus the server-only Supabase URL/secret, the movie-game migration, and at least one imported and human-approved eligible movie. If the catalog is empty or no movie is eligible, the route returns an unavailable response rather than falling back to sample or anime content. On 2026-10-14, the missing movie-serving migration was applied and its assignment function, expiry protections, purge functions, and hourly purge job were verified. The reviewed 20-record TMDB batch was imported and approved; production `/api/game/movies/today` returned HTTP 200 with an answer-free puzzle, a wrong guess revealed only the first clue, and the daily schedule was persisted. Future imports still require their own reviewed preview and explicit batch approval.

The public movie page includes an approved TMDB logo and the current required notice: “This application uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.” Content and game API responses are not cached. The six-month expiry is anchored to the original cached provider content and is not extended by provenance refreshes for approved records. Movie assignment and serving both reject expired content; the migration schedules `purge_expired_tmdb_movies()` hourly to delete it and its schedule. For a correction/removal request, immediately remove the affected title from play and invoke `purge_tmdb_movie('<provider-id>')`; review a fresh preview and record again only if permitted. If access ends, stop all TMDB use, disable/revoke its key in every environment, and invoke `purge_all_tmdb_movies()` promptly. These RPCs are service-role-only; never expose the Supabase secret or invoke purge against live data without owner approval. Commercial use requires a separate written agreement. Recheck the official [TMDB API terms](https://www.themoviedb.org/api-terms-of-use), [FAQ](https://developer.themoviedb.org/docs/faq), and [logo guidance](https://www.themoviedb.org/about/logos-attribution) before public rollout; the terms also prohibit TMDB content use in connection with an AI-based application.

### Wikidata novel metadata

Google Books is the desired API candidate, but its configured project currently has a zero-query daily quota and no local API key. It must not be retried until the owner enables the API and confirms positive quota. Open Library says its APIs are not intended as a bulk data backend, and the tested Gutendex results included duplicate editions and an audio recording while Project Gutenberg warns about territorial copyright and automated access. Neither is used by the Books importer. See [the bounded Books pilot](./google-books-pilot.md).

`npm.cmd run import:wikidata-books -- --query=Frankenstein` performs a bounded, no-write search from Windows PowerShell. Use `--limit=1` through `--limit=20` to control the maximum candidates; a query is required and must be reviewed. The mapper includes only exact novel entities with English labels, English-language metadata, CC0 aliases, English author/genre labels, and year-precision publication data. Wikidata search responses also contain descriptions, which the importer ignores; it does not save descriptions, summaries, cover links, book text, or raw Wikidata claims. A dry run prints at most five mapped records.

For a broader candidate batch, `npm.cmd run import:wikidata-books-bulk -- --limit=100` runs a read-only, bounded Wikidata SPARQL query (maximum 200 works), resolves each work/author/genre from Wikidata's entity API, and prints up to 20 mapped records. Add `--apply` only to the reviewed batch to upsert metadata into Supabase; imports remain `pending_review` and include no synopsis, description, or book text. The bulk importer spaces entity API requests, stops on rate limits, and performs no writes until all source records have been fetched and mapped.

Only after applying the migration and reviewing the specific preview may an operator explicitly use `--apply`; this requires the server-only Supabase credentials in ignored `.env.local`. The service-role batch upsert leaves each novel pending review and will not overwrite approved canonical book content on re-import. A reviewer must write an original synopsis, validate the novel/edition, author, year, and genres, and only then set `review_status = 'approved'`. The daily-book RPC selects only approved books with original synopsis, author, genre, and Wikidata provenance. The `/books` route uses a separate daily schedule and answer-free API; until a book is curated and assigned, Supabase mode returns 503 instead of a sample fallback. No automatic approval is included.

#### Books migration and rollout order

The local no-write preview on 2026-10-17 fetched ten candidates for `Frankenstein`: one mapped novel (*Frankenstein; or, The Modern Prometheus*, Wikidata Q150827) and nine rejected candidates. After owner preapproval, the staging migration was applied and Q150827 was imported. The owner reviewed and accepted the title, metadata, and original synopsis; it is approved. Six more bounded searches each returned one eligible novel: *Dracula* (Q41542), *Pride and Prejudice* (Q170583), *The Time Machine* (Q627333), *The War of the Worlds* (Q213019), *The Adventures of Tom Sawyer* (Q326914), and *Moby-Dick* (Q174596). These received original synopses and were approved after checking title, year, author, and genre metadata. A subsequent bulk SPARQL preview of 100 Wikidata entities mapped 98 candidates; the bounded apply mapped 97 records, including existing works, resulting in 93 additional pending-review books. Provider descriptions and book text were not saved. The live catalog now has 100 Wikidata novels total: seven approved playable titles and 93 pending editorial review.

Keep staging and gameplay enablement separate:

1. **Staging schema — applied 2026-10-17:** `20261016000100_add_wikidata_novel_import.sql` was executed against the configured Clueverse Supabase project after verifying the existing catalog dependencies and that the Books tables were absent. The tables, RLS, and service-role-only import RPCs were verified afterward.
2. **Bounded metadata imports — 100 books stored:** the initial seven candidates were individually reviewed and curated. A bounded bulk SPARQL query then imported 93 additional pending-review works. Only mapped structured metadata was stored; provider descriptions and book text were not retained.
3. **Editorial review:** seven novels have original synopses of at least 80 characters and `approved` status; 93 bulk-imported records remain `pending_review` and are excluded from play until curated. Metadata checks confirmed required year, linked author, genres, and Wikidata provenance.
4. **Daily scheduling migration — applied 2026-10-17:** `20261016000200_enable_daily_wikidata_novels.sql` was applied as a single reviewed SQL file. The schedule table, assignment RPC, and grants were verified; anonymous execution is denied and `service_role` execution is allowed.
5. **Production smoke test — passed 2026-10-17:** `/api/game/books/today` returns HTTP 200 with answer-free fields; repeated reads return the same date and puzzle ID; a wrong guess is rejected without disclosing the answer; suggestions include other approved books and omit the active answer. The first persisted production assignment is *Moby-Dick* for 2026-10-17 UTC. The public Books game is live.

**Migration history caveat:** this project has no `supabase_migrations.schema_migrations` table, although its existing catalog schema is present. Both Books migrations were therefore applied as single reviewed SQL files through the authenticated Supabase Management API (`supabase db query --linked --project-ref ... --file ...`), not through `supabase db push`; they are not recorded in a migration ledger. Books is live and verified, but do not run future `supabase db push` operations against this project until its existing migration baseline/history is reconciled, because the CLI could attempt to replay all repository migrations. Apply later schema changes only as explicitly reviewed individual files and record/reconcile the project migration history as a separate operational task.

### Title suggestions and wrong-guess comparisons

The shared game client provides keyboard-operable title suggestions for each vertical. In Supabase mode, anime suggestions use approved anime records; movie suggestions use approved TMDB-backed records whose source content has not expired; book suggestions use approved Wikidata-backed novels with publication-year, genre, and author metadata. Each list omits the active answer, and selecting a suggestion fills the input without submitting a guess. Players can also skip an attempt to reveal the next clue; the skip counts against the same attempt limit and the final skip ends the round. Free-form titles remain accepted, but field comparisons are available only when the exact title uniquely matches an approved catalog record.

For an incorrect catalog-backed guess, the server compares only metadata shared by the answer and guessed title. The response returns the guessed title’s values and safe comparison results, not the target title’s raw values. Matching genres/studios are marked as matches; year differences report only whether the answer is newer/older or earlier/later, and episode-count differences report only whether the answer has more/fewer episodes. Anime comparisons use available genre, release year, format, episode count, studio, and content rating; movie comparisons are intentionally limited to genre and release year; book comparisons use genre, publication year, and author. There is no director comparison because director data is not currently part of the movie catalog or clue model. If a title is missing or ambiguous, the game still checks the guess and reveals the normal progressive clue, while telling the player that a catalog suggestion is needed for comparisons.

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

The separate TMDB movie vertical is implemented and merged in PR #13. On 2026-10-14, 20 imported TMDB movies were approved, the live movie route served a puzzle, and the daily movie assignment was persisted. The serving migration and its expiry/purge safeguards are applied and verified in the configured Supabase project. Continue monitoring provider obligations, title quality, expiry, and correction/removal handling. See [the source evaluation](./source-evaluation.md) and [next-chat handoff](../progress.md).

After TMDB, consider Google Books only for fields covered by explicit rights and provider terms; do not persist descriptions/covers by default. Wikidata is secondary metadata for a separate manga game, not a standalone clue source. AniList is excluded from persistent ingestion under its current terms. Add sources one at a time, review current terms, attribution, rate limits, and credentials, and give each its own eligibility policy and tests. Flag possible cross-provider matches for human review instead of fuzzy-merging adaptations or editions.

## Serving and cache behavior

The player reads only the selected puzzle and the currently unlocked clue from our server/database. Never serialize the answer, aliases, or unrevealed clues in the initial response. Puzzle assignment is stable for a date; provider refreshes do not change an active puzzle.

The Supabase-backed game route assigns the date once and returns only the public, answer-free puzzle fields. Guess submission and private attempt state stay uncached. Do not cache a response containing the answer or unrevealed clues. We do not need Redis for this scale; measure traffic and cache misses before adding another service.

Each vertical defaults to its own original sample puzzle. `GAME_DATA_SOURCE=supabase` is opt-in and requires the applicable Supabase migrations and server-only credentials. Fullmetal Alchemist: Brotherhood remains explicitly scheduled for 2026-10-08; later dates are assigned on request after the daily-random migration is applied. Applying migrations and setting the Vercel production environment are separate deployment steps. Books sample mode is playable, while database mode also requires reviewed Wikidata novels with human-written synopsis content.
