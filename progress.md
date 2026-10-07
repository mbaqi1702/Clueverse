# ClueVerse progress and handoff

Last updated: 2026-10-08 00:56 +03:00

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- PR #3, #5, and #6 have merged to `main`. The production deployment is running the Next.js app with Supabase as its game data source.
- The first feature PR, #1, was merged into `main` on 2026-10-05. Its CI passed and Vercel reported a successful preview deployment.
- UI/UX PR #2 was merged into `main` on 2026-10-05. The paper-and-ink redesign, responsive layout, accessibility affordances, and loading/retry states are now part of the default branch.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and importer preparation.
  - `cae2e18` — merge of PR #2, the editorial UI redesign.
- PR #3 added opt-in server-only Supabase reads; PR #5 added persisted random daily assignment and Tenrai eligibility; PR #6 removed the obsolete “Original sample puzzle” footer.
- Vercel was corrected from the “Other” framework preset to Next.js after the production alias returned 404. The merged main deployment was redeployed, the production alias now serves the app, and the production API was verified.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link. The merged redesign passed local tests, lint, build, and Impeccable scans at 390px and 1440px; PR #2 CI and Vercel checks passed.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Previous local validation passed tests, lint, and production build. Impeccable rendered-page scans at 390px and 1440px reported no findings.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.

## Data status

- The project owner confirmed the catalog/RLS setup and reported applying the daily-assignment migration on 2026-10-08. Production Vercel has `GAME_DATA_SOURCE=supabase` and the Supabase server credentials configured.
- The catalog schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- The Tenrai importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, a five-record dry-run preview, and idempotent batched upserts. It defaults to a one-page no-write dry run; writing requires explicit `--apply`.
- The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai as the only implemented provider. Other providers still need separate terms, attribution, adapters, and eligibility rules.
- **Initial import completed 2026-10-07:** 2,296 usable Tenrai records were written from the top 100 pages; 204 were rejected by validation. The latest Supabase state verified 2,296 source rows.
- **First puzzle approved and scheduled:** Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) is scheduled for `2026-10-08` UTC. The daily-random migration automatically approved only existing Tenrai rows that pass the playable-data and rating rules; the remaining rows are not eligible unless they later meet those rules.
- The configured Supabase project has the catalog/RLS, Tenrai import, and daily-random/eligibility migrations applied (owner-confirmed); FMA is scheduled for 2026-10-08 UTC.
- Vercel Production is configured for Supabase mode and has a successful production deployment. The public API returned a database puzzle for UTC 2026-10-07, repeatedly returned the same ID, omitted answer/clues, and a wrong guess revealed only one clue.
- The daily assignment uses UTC dates. At UTC+3, the scheduled 2026-10-08 FMA puzzle begins at 03:00 local time. At 00:55 local, production was still serving UTC 2026-10-07; recheck after the date boundary.
- PR #6 is merged; its Next.js production redeployment has the neutral “Daily anime puzzle” footer instead of the stale sample label.
- No TMDB, Google Books, or other provider adapter is implemented. Add one only when that vertical is in scope, using its own mapping and terms review.

## Immediate next steps

See [`docs/next-steps.md`](./docs/next-steps.md) for the prioritized post-launch plan and a concise copyable handoff.

## Token-economy handoff for a new chat

Current handoff: PRs #3, #5, and #6 are merged. The daily-random migration is owner-confirmed applied; Vercel Production is running Supabase mode. The Oct 7 UTC puzzle is serving; verify the scheduled FMA puzzle after 03:00 UTC+3 on Oct 8. Only Tenrai is integrated; see [`docs/next-steps.md`](./docs/next-steps.md) for prioritized follow-ups.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
