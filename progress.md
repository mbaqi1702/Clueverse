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
- UI/UX PR #2 is open on `feat/ui-ux-round-1`. Its first visual pass was revised after feedback: removed gradients, indigo decoration, centered generic copy, and extra cards in favor of a restrained warm-ink and paper layout with a Georgia editorial face and one rust accent. The refreshed visual pass is pushed on this branch; check its latest preview before merging.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link. The Impeccable detector reports no remaining findings on the changed files or rendered page at 390px and 1440px. Recheck the refreshed preview after pushing.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Local validation on the current UI pass: 20 tests pass; lint and production build pass. Impeccable rendered-page scans at 390px and 1440px report no findings.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.
- The local dev server was stopped when pausing work.

## Data status

- The project owner confirmed the intended Supabase project migration and RLS state on 2026-10-05. PR #3 adds opt-in read-only puzzle serving; no database writes were made.
- Schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- Jikan importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, and idempotent batched upserts. It defaults to a one-page dry run; writing requires explicit `--apply`.
- **No Jikan records have been fetched or written by this project yet.** No provider terms/reuse permissions have been confirmed. Do not publicly display third-party metadata or images until a human reviews the relevant terms and attribution requirements.
- Game API/UI still defaults to the fictional sample puzzle. An opt-in server-only, read-only Supabase path is in PR #3 and returns unavailable if no approved puzzle is scheduled.
- No TMDB, Google Books, or other provider adapter is implemented. Add one only when that vertical is in scope, using its own mapping and terms review.

## Next steps when resuming

1. Review the refreshed mobile/desktop preview on PR #2, then merge when satisfied.
2. Review PR #3 for read-only Supabase puzzle serving. Keep Supabase mode off until rights are cleared and a puzzle is approved/scheduled.
3. Human-review Jikan/MyAnimeList terms: synopsis reuse, attribution, public display, rate limits, images, and retention. If uncertain, keep using original/independently licensed content.
4. Run `npm run import:jikan` only after confirming network use is acceptable; inspect the dry-run counts. This does not write to Supabase.
5. Only after explicit human approval, run a small `npm run import:jikan -- --apply` batch. Review pending rows for data quality and rights before approving or scheduling any puzzle.
6. Implement a server-only Supabase repository and connect today's puzzle endpoint to approved `daily_puzzles` data. Keep the answer, aliases, and unrevealed clues off the client. Add tests for repository behavior and answer privacy before switching off the sample.
7. Add caching only to the public answer-free daily-puzzle response after DB-backed serving exists. Keep guesses/private attempt state uncached. No Redis yet.
8. Continue UI/UX iteration using narrow-screen checks, keyboard/accessibility review, loading/error/end states, and preview feedback. Use 21st.dev search before selected component retrieval; maintain one consistent design system.
9. Add further provider adapters (for example, movies or books) only after choosing the next vertical and checking its licensing, attribution, and reuse terms. Once core daily play is proven, consider anonymous persistence/auth, streak/history, and then leaderboards.

## Token-economy handoff for a new chat

Paste this summary to resume without re-reading the whole conversation:

> ClueVerse is in `C:\Users\muham\2026\Projects\clueverse`, branch `feat/ui-ux-round-1`, based on merged `main`. PR #2 has the revised UI and is still open: the gradients, indigo decoration, generic centered copy, and excess cards have been replaced by a flatter paper-and-ink editorial layout, Georgia headings, and one rust accent. CI and Vercel checks should be rerun for the newest commit. PR #3 independently adds an opt-in, read-only Supabase puzzle path; default game mode stays sample and there was no approved puzzle scheduled at the last check. No Jikan data has been imported and provider rights are not reviewed. The importer is dry-run by default; `--apply` writes data. Keep `.env.local` secret and untracked. Review Jikan/MyAnimeList terms before any public use or import. Add other provider adapters only after choosing a vertical and checking its terms.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
