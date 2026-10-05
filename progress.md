# ClueVerse progress and handoff

Last updated: 2026-10-04

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- Current branch: `feat/daily-anime-puzzle`.
- Pushed commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and Jikan import preparation.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI is responsive and has loading/error states, keyboard form submission, and reduced-motion support. It is a foundation, not final visual polish: do more UX and visual iterations with 21st.dev and preview feedback.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Local validation at handoff: 20 tests pass; lint passes; production build passes; production dependency audit reported zero vulnerabilities.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.
- The local dev server was stopped when pausing work.

## Data status

- The Supabase catalog migration was manually applied by the project owner on 2026-10-04, per their confirmation. Verify the correct Supabase project and table/RLS state before further database writes.
- Schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- Jikan importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, and idempotent batched upserts. It defaults to a one-page dry run; writing requires explicit `--apply`.
- **No Jikan records have been fetched or written by this project yet.** No provider terms/reuse permissions have been confirmed. Do not publicly display third-party metadata or images until a human reviews the relevant terms and attribution requirements.
- Game API/UI still uses the fictional sample puzzle; it is not connected to Supabase yet.
- No TMDB, Google Books, or other provider adapter is implemented. Add one only when that vertical is in scope, using its own mapping and terms review.

## Next steps when resuming

1. Check whether the existing first PR has been created/submitted; it was not submitted during the earlier interactive GitHub prompt. Do not create duplicates; update or open one PR for `feat/daily-anime-puzzle` against `main`.
2. Verify that the migration is present in the intended Supabase project and RLS is enabled on all catalog tables.
3. Human-review Jikan/MyAnimeList terms: synopsis reuse, attribution, public display, rate limits, images, and retention. If uncertain, keep using original/independently licensed content.
4. Run `npm run import:jikan` only after confirming network use is acceptable; inspect the dry-run counts. This does not write to Supabase.
5. Only after explicit human approval, run a small `npm run import:jikan -- --apply` batch. Review pending rows for data quality and rights before approving or scheduling any puzzle.
6. Implement a server-only Supabase repository and connect today's puzzle endpoint to approved `daily_puzzles` data. Keep the answer, aliases, and unrevealed clues off the client. Add tests for repository behavior and answer privacy before switching off the sample.
7. Add caching only to the public answer-free daily-puzzle response after DB-backed serving exists. Keep guesses/private attempt state uncached. No Redis yet.
8. Iterate on UI/UX after viewing the Vercel preview: hierarchy, mobile layout, keyboard/accessibility, loading/error/empty states, end-of-game, result/share card. Use 21st.dev search/retrieval deliberately and keep a consistent design system.
9. Once core daily play is proven, consider anonymous persistence/auth, streak/history, and then leaderboards. Add other media sources later.

## Token-economy handoff for a new chat

Paste this summary to resume without re-reading the whole conversation:

> We are building ClueVerse in `C:\Users\muham\2026\Projects\clueverse`, branch `feat/daily-anime-puzzle`. It is a daily media guessing game, anime first, with a longer-term plan for movies/TV/books/manga. Stack: Next.js 16, TypeScript, Tailwind, Supabase Postgres, Vercel, GitHub Actions, and 21st.dev MCP for UI component discovery. Current branch has commits `8bcced8` (playable fictional sample puzzle; server-side guess checking; responsive UI; 15 tests/CI) and `05f9ba6` (typed Supabase catalog migration, Jikan mapper/import script, provenance/review workflow; 20 total tests). The owner says the migration has been applied. No Jikan data has been fetched/imported, provider rights are not reviewed, and gameplay still uses the fictional sample. The Jikan importer is dry-run by default; `--apply` writes data. Verify the Supabase target/RLS and review Jikan/MyAnimeList terms before import/public use. `.env.local` is ignored; never display or share its values. `.env.example` is safe/tracked. First ensure/open a single PR for this branch—the earlier interactive create-PR prompt was not submitted. Next: verify migration, terms review, dry run, human-approved small import, then implement server-only Supabase puzzle reads with answer privacy and cache only answer-free responses. Continue using short specs, acceptance tests, limited relevant context, CI and Vercel preview review; improve the UI iteratively with 21st.dev search before paid generation.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
