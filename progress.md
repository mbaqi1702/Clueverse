# ClueVerse progress and handoff

Last updated: 2026-10-05

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- Current branch: `feat/ui-ux-round-1`, based on the merged `main`.
- The first feature PR, #1, was merged into `main` on 2026-10-05. Its CI passed and Vercel reported a successful preview deployment.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and Jikan import preparation.
- A follow-up UI/UX iteration is in progress on `feat/ui-ux-round-1`; it has not been pushed or opened as a PR yet.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI is responsive and has loading/error states, keyboard form submission, and reduced-motion support. The follow-up iteration adds a clearer visual hierarchy, a warm opening-clue card, accessible attempts progress, and an explicit retry state when the puzzle fails to load. It still needs review at narrow mobile widths and against player feedback.
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

1. Finish, validate, and open a review PR for the UI/UX iteration on `feat/ui-ux-round-1`; check its mobile/desktop preview after deployment.
2. Verify with the project owner that the manually applied catalog migration and RLS settings are present in the intended Supabase project before any writes.
3. Human-review Jikan/MyAnimeList terms: synopsis reuse, attribution, public display, rate limits, images, and retention. If uncertain, keep using original/independently licensed content.
4. Run `npm run import:jikan` only after confirming network use is acceptable; inspect the dry-run counts. This does not write to Supabase.
5. Only after explicit human approval, run a small `npm run import:jikan -- --apply` batch. Review pending rows for data quality and rights before approving or scheduling any puzzle.
6. Implement a server-only Supabase repository and connect today's puzzle endpoint to approved `daily_puzzles` data. Keep the answer, aliases, and unrevealed clues off the client. Add tests for repository behavior and answer privacy before switching off the sample.
7. Add caching only to the public answer-free daily-puzzle response after DB-backed serving exists. Keep guesses/private attempt state uncached. No Redis yet.
8. Continue UI/UX iteration using narrow-screen checks, keyboard/accessibility review, loading/error/end states, and preview feedback. Use 21st.dev search before selected component retrieval; maintain one consistent design system.
9. Add further provider adapters (for example, movies or books) only after choosing the next vertical and checking its licensing, attribution, and reuse terms. Once core daily play is proven, consider anonymous persistence/auth, streak/history, and then leaderboards.

## Token-economy handoff for a new chat

Paste this summary to resume without re-reading the whole conversation:

> We are building ClueVerse in `C:\Users\muham\2026\Projects\clueverse`, branch `feat/ui-ux-round-1`, based on merged `main` (first feature PR #1 is merged). It is a daily media guessing game, anime first, with a longer-term plan for movies/TV/books/manga. Stack: Next.js 16, TypeScript, Tailwind, Supabase, Vercel, GitHub Actions, and 21st.dev for component discovery. The first release slice has a fictional sample puzzle, server-side guess checking, responsive UI, and 20 tests. The follow-up UI/UX pass is not yet in a PR. Supabase catalog schema and Jikan importer are prepared; the owner previously said they applied the migration, but verify the exact project and RLS before writes. No Jikan data has been imported and provider rights are not reviewed. The importer is dry-run by default; `--apply` writes data. Keep `.env.local` secret and untracked. Next: finish/preview the UI pass, then get owner confirmation of Supabase/RLS and review Jikan/MyAnimeList terms; only then dry-run and, with explicit approval, import a small batch. Connect gameplay to reviewed, approved daily puzzles with answer-privacy tests. Add other provider adapters only after the next vertical and its licensing requirements are chosen.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
