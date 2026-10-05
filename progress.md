# ClueVerse progress and handoff

Last updated: 2026-10-05 17:05 +03:00

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- Current branch: `docs/project-milestones`, based on the latest `origin/main`.
- The first feature PR, #1, was merged into `main` on 2026-10-05. Its CI passed and Vercel reported a successful preview deployment.
- UI/UX PR #2 was merged into `main` on 2026-10-05. The paper-and-ink redesign, responsive layout, accessibility affordances, and loading/retry states are now part of the default branch.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and Jikan import preparation.
  - `cae2e18` — merge of PR #2, the editorial UI redesign.
- PR #3, “Add opt-in read-only Supabase puzzle serving,” is still open. GitHub currently reports merge conflicts; resolve against current `main`, rerun CI, and review before merging. The branch adds an opt-in server-only database read path; sample mode remains the default.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link. The merged redesign passed local tests, lint, build, and Impeccable scans at 390px and 1440px; PR #2 CI and Vercel checks passed.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Local validation on the current UI pass: 20 tests pass; lint and production build pass. Impeccable rendered-page scans at 390px and 1440px report no findings.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.

## Data status

- The project owner confirmed the intended Supabase project migration and RLS state on 2026-10-05. The schema and importer are in `main`; the runtime reader is still in unmerged PR #3.
- The catalog schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- Jikan importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, and idempotent batched upserts. It defaults to a one-page dry run; writing requires explicit `--apply`.
- **No Jikan records have been fetched or written by this project yet.** Provider terms/reuse permissions have not been confirmed. Do not publicly display third-party metadata or images until a human reviews the relevant terms and attribution requirements.
- The configured Supabase project is reported provisioned with the migration and RLS applied, but it has no imported/approved catalog or scheduled puzzle. This means the database foundation exists; a populated, end-to-end production puzzle source is not ready yet.
- Game API/UI still defaults to the fictional sample puzzle. PR #3's opt-in server-only, read-only Supabase path explicitly returns unavailable if no approved puzzle is scheduled.
- No TMDB, Google Books, or other provider adapter is implemented. Add one only when that vertical is in scope, using its own mapping and terms review.

## Immediate next steps

1. Resolve PR #3's merge conflicts against `main`, preserve its opt-in/sample-default behavior, rerun tests/lint/build, then merge after review.
2. Review source terms and decide what content can be used publicly before importing or scheduling provider data.
3. Follow the staged database, anime-catalog, and additional-source work in [`milestones.md`](./milestones.md). Do not turn on Supabase mode until an approved puzzle is scheduled and the end-to-end API privacy checks pass.

## Token-economy handoff for a new chat

Paste this summary to resume without re-reading the whole conversation:

> ClueVerse's latest `main` includes merged PR #2's paper-and-ink UI redesign. PR #3 (opt-in, read-only Supabase puzzle serving) is still open and currently has merge conflicts. The Supabase catalog schema/import tooling are in `main`, and the owner reported that the intended project has the migration and RLS applied, but there are no imported/approved records or scheduled puzzles. Gameplay remains on the original fictional sample by default. No Jikan records have been imported and provider rights are not reviewed; importing requires a dry run followed by explicit `--apply`. See `milestones.md` for staged DB readiness, the first approved anime puzzle, and subsequent source adapters. Keep `.env.local` secret and untracked.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
