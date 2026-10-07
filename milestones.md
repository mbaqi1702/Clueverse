# ClueVerse milestones

This roadmap makes database readiness and additional content sources explicit, staged goals. It is intentionally outcome-based rather than date-based; do not promise launch dates until licensing, data quality, and review workload are understood.

## Current position

- **UI foundation — complete:** PR #2 is merged. The daily puzzle has a responsive paper-and-ink design, accessible structure, and loading/retry states.
- **Catalog foundation — 2,296 Tenrai records imported:** The project owner approved importing the top 100 pages; 2,296 usable records are now in Supabase, with 204 rejected by mapper validation. Fullmetal Alchemist: Brotherhood is approved and scheduled for 2026-10-08; the other records remain pending review.
- **Database-backed gameplay — in progress:** PR #3 adds opt-in read-only serving, but is open with merge conflicts. Sample mode remains the default. Do not enable database mode in production before resolving the PR, scheduling an approved puzzle, and validating the full player flow.
- **External source — selected; initial import complete:** Tenrai is selected as the MyAnimeList metadata API. The project owner reports reviewing MyAnimeList terms for the intended use. The Jikan public API is unavailable and is no longer the selected endpoint. One of the 2,296 imported usable records is approved and scheduled; the other 2,295 await curation. TMDB, Google Books, and other providers are candidates only, not selected or approved sources.

## Milestone 1 — Merge safe database-backed puzzle serving

**Status: In progress — PR #3**

Resolve the PR conflicts against current `main`, review the resulting diff, and merge only after fresh CI passes.

Acceptance criteria:

- Supabase mode is opt-in; sample mode remains the default.
- Reads are server-only and read-only; no service key reaches browser code.
- An absent or unapproved scheduled puzzle produces a clear unavailable response, not a silent sample fallback.
- The public puzzle response excludes the answer, aliases, and unrevealed clues; guesses remain checked server-side.
- Tests cover missing configuration/data, approved scheduled puzzle mapping, and answer privacy.

## Milestone 2 — Clear and document the first source

**Status: Owner review reported complete; Tenrai selected**

The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai, a third-party API for MyAnimeList-sourced metadata. Tenrai service availability and limits remain operational dependencies; imported rows stay pending review until individually curated.

Acceptance criteria:

- The project owner reports reviewing MyAnimeList's terms for the intended use; Tenrai attribution is stored with each imported record.
- Any content without clear permission is excluded from import or kept out of public puzzles.
- The selected source fields and attribution are visible to reviewers alongside each catalog record.
- If terms are uncertain or disallow the needed use, use original or independently licensed puzzle content instead.

## Milestone 3 — Populate and curate the anime catalog

**Status: Import complete; curation in progress**

The approved top-100-page Tenrai import completed with 2,296 usable records and 204 rejected entries. Fullmetal Alchemist: Brotherhood is approved and scheduled for 2026-10-08; keep the remaining records pending review until individually cleared.

Acceptance criteria:

- A no-write dry run is reviewed first; its counts, validation failures, and sample mappings are understood.
- Only after explicit human approval, a small `--apply` import is run against the intended Supabase project.
- Reviewers check provenance, terms, attribution, content suitability, synopsis/clue quality, duplicates, aliases, and answer leakage.
- At least one cleared record is approved and scheduled for a test date; no unreviewed record can be scheduled or published.
- Importing is repeatable/idempotent, and a provider refresh cannot silently overwrite approved puzzle content.

## Milestone 4 — Prove end-to-end database readiness

**Status: Not started; depends on Milestones 1 and 3**

Treat “database ready” as more than an applied migration: the approved catalog, schedule, server route, and operational safeguards must work together.

Acceptance criteria:

- A scheduled approved puzzle loads from Supabase through the production-shaped server path.
- The answer and unrevealed clues are absent from initial responses, logs, and browser-visible payloads.
- Guess checking reveals only the next permitted clue and returns the correct end state.
- No scheduled puzzle, database outage, invalid row, or missing secret fails explicitly; there is no hidden sample fallback in Supabase mode.
- RLS and server-only credentials are rechecked; migration/setup and recovery steps are documented.
- Staging/preview is verified before any human-approved production switch. Keep caching limited to public, answer-free data.
- Once the read path is proven, choose the daily anime randomly from the curated, approved eligible catalog, but persist the date assignment so every player gets the same puzzle for that UTC day.

## Milestone 5 — Add additional media sources one at a time

**Status: Planned; after the anime path is proven**

Choose the next vertical based on player interest and source permissions. Potential providers include TMDB for movies/TV, Google Books for books, and a separately reviewed source for manga. These are candidates only; each requires its own current terms, attribution, credentials, and data-use review.

Acceptance criteria for each new source:

- The source and vertical are explicitly selected after terms and reuse review.
- A separate adapter maps provider data into the canonical media model and preserves provider IDs, provenance, and snapshots.
- Provider-specific fields are used as clues only when their accuracy and permitted use are understood.
- Duplicate/cross-provider matches are reviewed explicitly rather than automatically merged.
- Import, mapping, validation, attribution, and failure behavior have focused tests.
- Records follow the same pending-review → human approval → scheduling flow; the player request path never calls the provider directly.

Do not build multiple adapters in advance or ingest images until image rights and storage/attribution requirements are settled.

## Milestone 6 — Harden and operate the catalog

**Status: Later**

Once real players use the database-backed game, establish proportionate operations before adding more infrastructure.

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
