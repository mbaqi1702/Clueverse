# ClueVerse milestones

This roadmap makes database readiness and additional content sources explicit, staged goals. It is intentionally outcome-based rather than date-based; do not promise launch dates until licensing, data quality, and review workload are understood.

## Current position

- **UI foundation — complete:** PR #2 is merged. The daily puzzle has a responsive paper-and-ink design, accessible structure, and loading/retry states.
- **Catalog foundation — 2,296 Tenrai records imported:** The top 100 pages produced 2,296 usable records and 204 mapper rejections. Fullmetal Alchemist: Brotherhood is manually scheduled for 2026-10-08. The new daily-random migration will automatically approve only playable Tenrai records; incomplete and explicitly Rx/Hentai-rated records remain out of daily selection.
- **Database-backed gameplay — merged:** PR #3 and persisted daily assignment are merged. Supabase mode remains opt-in; the daily-assignment migration's application state is not confirmed here.
- **External sources — assessment and first movie adapter complete:** Tenrai is the anime provider. The bounded TMDB movie importer and service-role RPC are implemented; the project owner reports applying its migration to the intended Supabase project. No live TMDB preview or data import has occurred because no API key is configured locally. TMDB attribution and retention/removal handling remain prerequisites for public display. Google Books is field-scoped, Wikidata is secondary manga metadata, and AniList is excluded from persistent ingestion. See [the source evaluation](./docs/source-evaluation.md).
- **Gameplay UI polish — in progress:** The warm page background and input contrast have been improved, and the MAL Rewrite editorial suffix is omitted from public puzzle copy. Anime title suggestions and skip behavior remain planned.

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

## Milestone 3 — Populate and curate the anime catalog

**Status: Import complete; automatic eligibility migration merged, application state unconfirmed**

The approved top-100-page Tenrai import completed with 2,296 usable records and 204 rejected entries. Fullmetal Alchemist: Brotherhood is scheduled for 2026-10-08. The merged migration promotes existing playable Tenrai rows and adds the same rule for subsequent imports; confirm it has been applied to the project.

Acceptance criteria:

- A no-write dry run is reviewed first; its counts, validation failures, and sample mappings are understood.
- Only after explicit human approval, a small `--apply` import is run against the intended Supabase project.
- Monitor provenance, attribution, content suitability, synopsis/clue quality, duplicates, aliases, and answer leakage.
- The database automatically selects only approved, playable rows and persists a stable assignment per UTC date.
- Importing is repeatable/idempotent, and a provider refresh cannot silently overwrite approved puzzle content.

## Milestone 4 — Prove end-to-end database readiness

**Status: In progress; depends on applying the new migration and deployment configuration**

Treat “database ready” as more than an applied migration: the approved catalog, schedule, server route, and operational safeguards must work together.

Acceptance criteria:

- A scheduled approved puzzle loads from Supabase through the production-shaped server path.
- The answer and unrevealed clues are absent from initial responses, logs, and browser-visible payloads.
- Guess checking reveals only the next permitted clue and returns the correct end state.
- No scheduled puzzle, database outage, invalid row, or missing secret fails explicitly; there is no hidden sample fallback in Supabase mode.
- RLS and server-only credentials are rechecked; migration/setup and recovery steps are documented.
- Staging/preview is verified before any human-approved production switch. Keep caching limited to public, answer-free data.
- Choose randomly from approved playable anime, persist the assignment per UTC date, preserve an explicitly scheduled puzzle, and prefer not-yet-used titles.

## Milestone 5 — Add additional media sources one at a time

**Status: TMDB movie ingestion implemented; public display safeguards and other sources remain**

TMDB movies are the first additional source; the bounded importer and service-role RPC are implemented. Google Books remains field-scoped, Wikidata is secondary manga metadata, and AniList is excluded from persistent catalog ingestion under its current terms. See [the source evaluation](./docs/source-evaluation.md).

Acceptance criteria for each new source:

- The source and vertical are explicitly selected after terms and reuse review.
- A separate adapter maps provider data into the canonical media model and preserves provider IDs, provenance, and snapshots.
- Provider-specific fields are used as clues only when their accuracy and permitted use are understood.
- Duplicate/cross-provider matches are reviewed explicitly rather than automatically merged.
- Import, mapping, validation, attribution, and failure behavior have focused tests.
- Define eligibility independently for each provider; the player request path never calls the provider directly.
- Before public TMDB display, provide the required logo/notice and implement cache and removal/purge obligations.

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
