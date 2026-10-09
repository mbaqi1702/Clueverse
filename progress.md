# ClueVerse progress and handoff

Last updated: 2026-10-09

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Start with anime; later reuse the game engine for movies, TV, books, manga, and other content. Prioritize fast deployment, accessible/mobile-friendly UX, low operating cost, and small specs with tests. Keep humans responsible for licensing, product choices, secrets, database operations, and production approval.

## Current repository state

- PR #3 has merged to `main` (merge commit `d69ff17`), as has persisted daily assignment and automatic Tenrai eligibility. Supabase mode remains opt-in; the daily-assignment migration's application state is not confirmed here.
- The first feature PR, #1, was merged into `main` on 2026-10-05. Its CI passed and Vercel reported a successful preview deployment.
- UI/UX PR #2 was merged into `main` on 2026-10-05. The paper-and-ink redesign, responsive layout, accessibility affordances, and loading/retry states are now part of the default branch.
- Merged commits:
  - `8bcced8` — first playable daily puzzle slice.
  - `05f9ba6` — Supabase catalog schema and importer preparation.
  - `cae2e18` — merge of PR #2, the editorial UI redesign.
- PR #3, “Add opt-in read-only Supabase puzzle serving,” is merged. Supabase remains opt-in and sample mode is still the default.
- The first playable UI uses an original fictional sample puzzle. The daily answer and clues stay server-side; wrong guesses reveal a clue, guesses are normalized, and the round ends after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link. The merged redesign passed local tests, lint, build, and Impeccable scans at 390px and 1440px; PR #2 CI and Vercel checks passed.
- 21st.dev CLI login and component search were verified. One free component retrieval was used to inform the custom input component. Keep catalog search as the low-cost default; check usage before paid retrieval/generation.
- GitHub Actions CI runs tests, lint, and build.
- Previous local validation passed tests, lint, and production build. Impeccable rendered-page scans at 390px and 1440px reported no findings.
- `.env.local` is ignored by Git. `.env.example` contains names only and should remain trackable. Never print, commit, or share secret values.

## Data status

- The project owner confirmed the intended Supabase project migration and RLS state on 2026-10-05. The schema, Tenrai importer, and opt-in runtime reader are in `main`; the new daily-assignment migration is being developed separately.
- The catalog schema includes typed common media fields (including `synopsis`), source provenance/snapshots, aliases, genres/studios, review status, and scheduled daily puzzles. Only approved records can be scheduled/published.
- The Tenrai importer supports paged fetching, validation, source IDs/attribution metadata, retry/backoff, a five-record dry-run preview, and idempotent batched upserts. It defaults to a one-page no-write dry run; writing requires explicit `--apply`.
- The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai for anime. A bounded TMDB movie importer and service-role RPC migration are implemented; the project owner reports applying the TMDB migration to the intended Supabase project. No TMDB API key is configured locally, so no live preview or TMDB data import has occurred. TMDB attribution and retention/removal safeguards remain necessary before public display.
- **Initial import completed 2026-10-07:** 2,296 usable Tenrai records were written from the top 100 pages; 204 were rejected by validation. The latest Supabase state verified 2,296 source rows.
- **First puzzle approved and scheduled:** Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) is approved for `2026-10-08`; the schedule was verified in Supabase. The other imported rows remain pending review.
- The configured Supabase project has the catalog/RLS and Tenrai import migrations applied, with FMA scheduled for 2026-10-08. The daily-random/eligibility migration is in `main`; its application state is not confirmed here.
- Game API/UI still defaults to the fictional sample puzzle. Supabase mode is opt-in. Once the daily-random migration is applied, first requests persist one playable approved anime per UTC date; the existing FMA schedule is preserved.
- Google Books remains field-scoped research; Wikidata is secondary manga metadata research, and AniList is excluded from persistent ingestion under its current terms.

## Immediate next steps

1. Configure `TMDB_API_KEY` in `.env.local` and review `npm run import:tmdb` dry-run output; do not run `--apply` without explicit batch approval. The migration is reported applied by the project owner.
2. Implement TMDB attribution UI and cache/removal purge handling before displaying TMDB-backed content publicly.
3. Confirm the daily-random Tenrai eligibility migration is applied and verify end-to-end puzzle serving/privacy before enabling Supabase mode in production.
4. Continue Google Books field-permission and Wikidata manga-classification work; do not persist AniList catalog data.

## Token-economy handoff for a new chat

Current handoff: PR #3 and the daily-assignment feature are merged. The project owner reports applying the TMDB movie importer migration; no TMDB live preview or data import has been performed because the API key is absent locally. Add it to `.env.local`, review a dry run, and retain explicit approval before any import. TMDB attribution and retention/removal handling are required before public display. Supabase has 2,296 Tenrai rows and FMA is scheduled for 2026-10-08; sample mode remains the default.

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
