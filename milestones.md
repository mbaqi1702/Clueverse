# ClueVerse milestones

This roadmap makes database readiness and additional content sources explicit, staged goals. It is intentionally outcome-based rather than date-based; do not promise launch dates until licensing, data quality, and review workload are understood.

## Current position

- **UI foundation — complete:** PR #2 is merged. The daily puzzle has a responsive paper-and-ink design, accessible structure, and loading/retry states.
- **Catalog foundation — 2,296 Tenrai records imported:** The top 100 pages produced 2,296 usable records and 204 mapper rejections. The owner reports applying the daily-random migration; Tenrai records that meet the synopsis/clue-quality rules and are not explicitly Rx/Hentai-rated become eligible without per-title approval.
- **Database-backed gameplay — deployed:** PRs #3, #5, and #6 are merged. Vercel Production serves Supabase-backed daily puzzles; assignment is persisted per UTC date and the game UI no longer labels the puzzle as a sample.
- **External source — selected; initial import complete:** Tenrai is the only implemented provider. The project owner reports reviewing MyAnimeList terms for the intended use. Other sources (including TMDB and Google Books) are candidates only and require their own terms, attribution, adapter, and eligibility review.

## Milestone 1 — Merge safe database-backed puzzle serving

**Status: Complete — PR #3 merged**

PR #3 added the opt-in server-only Supabase read path and preserved sample mode as the default.

Acceptance criteria:

- Supabase mode is opt-in; sample mode remains the default.
- Reads are server-only and read-only; no service key reaches browser code.
- An absent or unapproved scheduled puzzle produces a clear unavailable response, not a silent sample fallback.
- The public puzzle response excludes the answer, aliases, and unrevealed clues; guesses remain checked server-side.
- Tests cover missing configuration/data, approved scheduled puzzle mapping, and answer privacy.

## Milestone 2 — Clear and document the first source

**Status: Owner review reported complete; Tenrai selected**

The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai, a third-party API for MyAnimeList-sourced metadata. Tenrai service availability and limits remain operational dependencies. Only imports are explicit (`--apply`); playable Tenrai rows are eligible without per-title approvals.

Acceptance criteria:

- The project owner reports reviewing MyAnimeList's terms for the intended use; Tenrai attribution is stored with each imported record.
- Tenrai records become eligible automatically only when they pass the documented synopsis/clue-quality gate; other providers are not automatically approved.
- The selected source fields and attribution are visible to reviewers alongside each catalog record.
- If terms are uncertain or disallow the needed use, use original or independently licensed puzzle content instead.

## Milestone 3 — Populate and qualify the anime catalog

**Status: Initial import complete; data-quality monitoring remains**

The top-100-page Tenrai import completed with 2,296 usable records and 204 rejected entries. The daily-random migration has been applied per owner confirmation. Fullmetal Alchemist: Brotherhood remains scheduled for 2026-10-08 UTC. Eligible existing and future Tenrai imports no longer need per-title approvals.

Acceptance criteria:

- A no-write dry run is reviewed first; its counts, validation failures, and sample mappings are understood.
- Only after explicit human approval, a small `--apply` import is run against the intended Supabase project.
- Monitor provenance, attribution, content suitability, synopsis/clue quality, duplicates, aliases, and answer leakage.
- The database automatically selects only approved, playable rows and persists a stable assignment per UTC date.
- Importing is repeatable/idempotent, and a provider refresh cannot silently overwrite approved puzzle content.

## Milestone 4 — Prove end-to-end database readiness

**Status: Complete for the first production slice; operational follow-up remains**

Treat “database ready” as more than an applied migration: the approved catalog, schedule, server route, and operational safeguards must work together.

Acceptance criteria:

- Production Vercel serves the daily puzzle from Supabase; the API has been checked for stable date assignment and answer privacy.
- The answer and unrevealed clues are absent from initial responses, logs, and browser-visible payloads.
- Guess checking reveals only the next permitted clue and returns the correct end state.
- No scheduled puzzle, database outage, invalid row, or missing secret fails explicitly; there is no hidden sample fallback in Supabase mode.
- RLS and server-only credentials are rechecked; migration/setup and recovery steps are documented.
- Production configuration is explicit, and only the public answer-free puzzle response is served; guess submission stays uncached.
- Choose randomly from approved playable anime, persist the assignment per UTC date, preserve an explicitly scheduled puzzle, and prefer not-yet-used titles.

## Milestone 5 — Add additional media sources one at a time

**Status: Planned; only Tenrai is currently implemented**

After validating sustained anime play and catalog quality, choose one next vertical. TMDB for movies/TV and Google Books for books are candidates, not approved providers; each requires current terms, attribution, credentials, and data-use review. Manga needs its own source research.

Acceptance criteria for each new source:

- The source and vertical are explicitly selected after terms and reuse review.
- A separate adapter maps provider data into the canonical media model and preserves provider IDs, provenance, and snapshots.
- Provider-specific fields are used as clues only when their accuracy and permitted use are understood.
- Duplicate/cross-provider matches are reviewed explicitly rather than automatically merged.
- Import, mapping, validation, attribution, and failure behavior have focused tests.
- Define eligibility independently for each provider; the player request path never calls the provider directly.

Do not build multiple adapters in advance or ingest images until image rights and storage/attribution requirements are settled.

## Milestone 6 — Harden and operate the catalog

**Status: Later**

As real players use the database-backed game, establish proportionate operations before adding more infrastructure.

Acceptance criteria:

- Document migration ownership, backup/restore expectations, access boundaries, and key rotation.
- Add minimal monitoring for failed puzzle reads, stale/missing schedules, and import errors without logging secrets or answer data.
- Measure traffic and response latency; add cache layers or background workers only when evidence requires them.
- Define a human review cadence and content correction/removal process for provider changes or rights concerns.

Accounts, saved history, streaks, and leaderboards remain separate product decisions after anonymous daily play is validated.

## Working rules

- Never commit or expose `.env.local`, `SUPABASE_SECRET_KEY`, or provider credentials.
- Dry runs do not authorize writes; `--apply` requires explicit human approval.
- No third-party data, text, or imagery is assumed licensed merely because an API returns it.
- Keep production enablement and database writes human-approved.
- Track implementation status and the current blocker in [`progress.md`](./progress.md); consult [`docs/data-pipeline.md`](./docs/data-pipeline.md) for the import and serving details.
