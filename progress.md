# ClueVerse progress and handoff

Last updated: 2026-10-05

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- Current branch: `feat/supabase-read-only-puzzles`, based on the merged `main`.
- The first feature PR (#1) is merged. The UI/UX follow-up PR (#2) is open separately and its CI and Vercel deployment passed.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and Jikan import preparation.
- The Supabase read-path changes are open in PR #3; CI and the Vercel preview deployment passed.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI is responsive and has loading/error states, keyboard form submission, and reduced-motion support. UI/UX improvements are in PR #2: clearer visual hierarchy, a warm opening clue, accessible attempt progress, and load retry behavior. Preview feedback and narrow-screen review remain.
- An opt-in server-only Supabase read path is implemented on this branch. It requires `GAME_DATA_SOURCE=supabase`, reads only approved anime puzzles scheduled/published for the current UTC date, and returns an explicit 503 when no eligible puzzle exists. Default mode remains the fictional sample.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Local validation on the database iteration: 28 tests passed; lint and production build passed. The read-only Supabase request confirmed no approved puzzle is scheduled for 2026-10-05 UTC. Production dependency audit reports zero vulnerabilities; the full audit reports five high-severity findings in the existing ESLint development dependency tree.
- `.env.local` is ignored by Git. `.env.example` contains blank secret placeholders and a sample-mode default. Never print, commit, or share secret values.
- The local dev server was stopped when pausing work.

## Data status

- The project owner confirmed the intended Supabase project migration and RLS state on 2026-10-05. No database writes were made during the read-path work.
- Schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- Jikan importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, and idempotent batched upserts. It defaults to a one-page dry run; writing requires explicit `--apply`.
- **No Jikan records have been fetched or written by this project yet.** No provider terms/reuse permissions have been confirmed. Do not publicly display third-party metadata or images until a human reviews the relevant terms and attribution requirements.
- Game API/UI defaults to the fictional sample. The opt-in Supabase read path was exercised locally against the configured project and correctly returned no scheduled approved puzzle for 2026-10-05 UTC. No synopsis or answer data was printed during that check.
- No TMDB, Google Books, or other provider adapter is implemented. Add one only when that vertical is in scope, using its own mapping and terms review.

## Next steps when resuming

1. Review and merge PR #3; keep Supabase mode disabled until reviewed records are ready.
2. The project owner confirmed the intended Supabase migration and RLS state on 2026-10-05. Keep database reads read-only; do not import or change database records without explicit approval.
3. Human-review Jikan/MyAnimeList terms: synopsis reuse, attribution, public display, rate limits, images, and retention. If uncertain, keep using original/independently licensed content.
4. Run `npm run import:jikan` only after confirming network use is acceptable; inspect the dry-run counts. This does not write to Supabase.
5. Only after explicit human approval, run a small `npm run import:jikan -- --apply` batch. Review pending rows for data quality and rights before approving or scheduling any puzzle.
6. Enable `GAME_DATA_SOURCE=supabase` only after a sufficiently complete, approved puzzle is scheduled for the current UTC date. The read path checks for approved anime, derives four clues from reviewed metadata, and never exposes the answer/aliases/unrevealed clues in the initial response.
7. The API still uses `no-store`. Consider caching only the public answer-free daily-puzzle response after deployment and rights behavior are verified; keep guesses/private attempt state uncached. No Redis yet.
8. Continue UI/UX iteration using narrow-screen checks, keyboard/accessibility review, loading/error/end states, and preview feedback. Use 21st.dev search before selected component retrieval; maintain one consistent design system.
9. Add further provider adapters (for example, movies or books) only after choosing the next vertical and checking its licensing, attribution, and reuse terms. Once core daily play is proven, consider anonymous persistence/auth, streak/history, and then leaderboards.

## Token-economy handoff for a new chat

Paste this summary to resume without re-reading the whole conversation:

> ClueVerse is in `C:\Users\muham\2026\Projects\clueverse`, currently on `feat/supabase-read-only-puzzles`. First feature PR #1 is merged. UI/UX PR #2 (`feat/ui-ux-round-1`) and read-only Supabase PR #3 are open; both have passing CI and Vercel deployments. Supabase mode is gated by `GAME_DATA_SOURCE=supabase`; default remains the original fictional sample. A local read against the confirmed Supabase project found no approved puzzle scheduled for 2026-10-05 UTC and made no writes. The owner confirmed migration/RLS, but Jikan/MyAnimeList rights are not reviewed and no provider records have been imported. The importer defaults to dry-run; `--apply` writes and requires human approval. `.env.local` is ignored; never display or share its values. Before enabling DB mode, review provider permissions, approve a complete record, and schedule it. Add further providers only after selecting the next vertical and reviewing its terms.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
