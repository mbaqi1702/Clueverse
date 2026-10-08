# ClueVerse progress and handoff

Last updated: 2026-10-09

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- Current branch: `docs/project-milestones`, based on the latest `origin/main`.
- The first feature PR, #1, was merged into `main` on 2026-10-05. Its CI passed and Vercel reported a successful preview deployment.
- UI/UX PR #2 was merged into `main` on 2026-10-05. The paper-and-ink redesign, responsive layout, accessibility affordances, and loading/retry states are now part of the default branch.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and importer preparation.
  - `cae2e18` — merge of PR #2, the editorial UI redesign.
- PR #3, “Add opt-in read-only Supabase puzzle serving,” is still open. GitHub currently reports merge conflicts; resolve against current `main`, rerun CI, and review before merging. The branch adds an opt-in server-only database read path; sample mode remains the default.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link. The merged redesign passed local tests, lint, build, and Impeccable scans at 390px and 1440px; PR #2 CI and Vercel checks passed.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- The earlier UI pass had 20 tests passing; the current full test suite has 25 passing tests. The TMDB mapper's focused suite has 5 passing tests. Type-check and targeted TMDB lint pass; no production build was run for the importer.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.

## Data status

- The project owner confirmed the intended Supabase project migration and RLS state on 2026-10-05. The schema and importer are in `main`; the runtime reader is still in unmerged PR #3.
- The catalog schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- The Tenrai importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, a five-record dry-run preview, and idempotent batched upserts. It defaults to a one-page no-write dry run; writing requires explicit `--apply`.
- The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai as the API source. Tenrai's current API responded during research. The Jikan public API did not accept TCP connections in the owner's environment and is no longer used by the importer.
- **Initial import completed 2026-10-07:** the approved top 100 Tenrai pages contained 2,500 fetched entries. After an intermittent API failure on page 8, the import resumed from that page and completed: 2,296 usable records written, 204 rejected by validation. The dry run made no writes. A direct Supabase count verified 2,296 Tenrai source records. All but the one scheduled puzzle remain pending review; images are not imported.
- **First puzzle approved and scheduled:** Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) is approved for `2026-10-08`; the schedule was verified in Supabase. The other imported rows remain pending review.
- The configured Supabase project has the catalog migration/RLS and Tenrai import RPC migration applied. The catalog now has an approved scheduled puzzle; production readiness still depends on resolving PR #3 and verifying the end-to-end player flow/privacy.
- Game API/UI still defaults to the fictional sample puzzle. PR #3's opt-in server-only, read-only Supabase path explicitly returns unavailable if no approved puzzle is scheduled.
- A TMDB movie importer is implemented with a bounded one-page no-write preview, explicit `--apply`, mapper tests, and a server-only API key. Its migration adds a service-role-only RPC and preserves approved canonical records. A live dry run is pending because `TMDB_API_KEY` is not configured in `.env.local`; no TMDB records have been written.
- A 29-record, no-write Wikidata sample supports metadata enrichment but not clue text: creators appeared on 19/29, dates 13/29, genres 9/29, and English aliases 9/29. The selector still needs refinement for manga works versus volumes/short works.

## Immediate next steps

1. Add `TMDB_API_KEY` to `.env.local` locally, then run and review `npm run import:tmdb`; no key or live request is needed for the current mapper tests.
2. Review and apply `20261009000100_add_tmdb_movie_import.sql` in the intended Supabase project before any importer write; a small `--apply` batch still requires a reviewed dry run and explicit approval.
3. Implement TMDB attribution and a cache/removal purge process before displaying TMDB-backed data publicly.
4. Resolve PR #3's merge conflicts against `main`, preserve its opt-in/sample-default behavior, rerun tests/lint/build, then merge after review; verify answer privacy before enabling database mode.
5. Review the other 2,295 Tenrai records individually; leave unsuitable records pending or reject them.

## Token-economy handoff for a new chat

Current handoff: the bounded TMDB importer and service-role RPC migration are implemented, but `TMDB_API_KEY` is absent from `.env.local`; no live request or TMDB write has occurred. Run a reviewed dry run and apply the migration before any approved small batch. TMDB attribution and retention/removal handling are still required before public display. PR #3 has merge conflicts in `README.md` and `progress.md`; 2,296 Tenrai records are imported, Fullmetal Alchemist: Brotherhood is approved/scheduled for 2026-10-08, and the other 2,295 records await review.

The original handoff below is retained as historical context and is outdated:

> ClueVerse's latest `main` includes merged PR #2's paper-and-ink UI redesign. PR #3 (opt-in, read-only Supabase puzzle serving) remains open with merge conflicts. The project owner reports the catalog/RLS and Tenrai RPC migrations applied and MyAnimeList terms reviewed for the intended use. Tenrai is selected; the Jikan public API is no longer used. On 2026-10-07 the owner approved the first batch (24 usable records; one rejected) and Fullmetal Alchemist: Brotherhood (MAL ID 5114) was approved and scheduled for 2026-10-08. The other imported records remain pending review. Next resolve PR #3 and verify scheduled puzzle serving/privacy before enabling Supabase mode. Gameplay still uses the fictional sample by default. See `milestones.md` and `docs/data-pipeline.md`; keep `.env.local` secret and untracked.

## Workflow / token-cost habits

- Start a new chat by pasting the handoff above and asking for one bounded next step.
- Point the agent to the relevant spec, file(s), and exact failing test/log instead of pasting the full blueprint or repository.
- Ask for a small diff and request a short changed-files/tests/risks summary.
- Keep product/architecture decisions in this file or the relevant spec, not repeated in every prompt.
- Prefer tests, lint, build, CI, and preview links as evidence over repeatedly asking for broad reviews.
- Use 21st.dev search first; inspect usage/quota before retrieving code or using generation.
- Avoid spawning multiple agents for the same work; use a test-first handoff only where it provides independent value.
