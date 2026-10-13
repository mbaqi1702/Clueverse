# ClueVerse milestones

This roadmap makes database readiness and additional content sources explicit, staged goals. It is intentionally outcome-based rather than date-based; do not promise launch dates until licensing, data quality, and review workload are understood.

## Current position

- **UI foundation — complete:** PR #2 is merged. The daily puzzle has a responsive paper-and-ink design, accessible structure, and loading/retry states.
- **Catalog foundation — 2,296 Tenrai anime rows:** Supabase counts checked 2026-10-12 found 2,296 anime and 2,272 approved. The latest movie catalog check on 2026-10-14 found 20 imported and approved TMDB movies. Only records passing the documented provider-specific rules can be selected.
- **Database-backed gameplay — implemented:** PR #3 and persisted daily assignment are merged; the project owner reports applying the required migrations. Reconfirm the live project/environment before new writes or production changes.
- **External sources — TMDB movie vertical serving:** PR #13 and its Vercel preview checks passed. The owner cleared TMDB for the intended game use. On 2026-10-14, the movie-serving migration and purge protections were applied, a reviewed 20-record batch was approved, and production returned an answer-free movie puzzle with HTTP 200. The schedule now contains its daily assignment. Future imports still require a reviewed preview and explicit batch approval. Google Books remains field-scoped, Wikidata is secondary manga metadata, and AniList is excluded from persistent ingestion. See [the source evaluation](./docs/source-evaluation.md).
- **Gameplay UI polish — in progress:** PR #10's contrast/synopsis cleanup and PR #11's approved-anime title suggestions are merged. The current feature extends suggestions to movies, adds safe field-by-field comparisons after wrong catalog-backed guesses, and simplifies the shared visual palette. It is local-only until validation and owner review. Skip behavior remains a later follow-up.
- **Catalog snapshot (2026-10-14):** 2,296 anime records and 2,272 approved (anime last checked 2026-10-12); 20 TMDB movie records approved, with one persisted daily movie schedule.

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

**Status: Import complete; eligibility migration merged and reported applied**

The approved top-100-page Tenrai import completed with 2,296 usable records and 204 rejected entries. A 2026-10-12 query found 2,272 approved anime; refresh this count as catalog state can change. The owner reports the migration that promotes playable Tenrai rows has been applied.

Acceptance criteria:

- A no-write dry run is reviewed first; its counts, validation failures, and sample mappings are understood.
- Only after explicit human approval, a small `--apply` import is run against the intended Supabase project.
- Monitor provenance, attribution, content suitability, synopsis/clue quality, duplicates, aliases, and answer leakage.
- The database automatically selects only approved, playable rows and persists a stable assignment per UTC date.
- Importing is repeatable/idempotent, and a provider refresh cannot silently overwrite approved puzzle content.

## Milestone 4 — Prove end-to-end database readiness

**Status: Serving path implemented; verify operational readiness before changing production**

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

**Status: Serving in production — initial catalog activation complete**

The bounded importer, service-role RPC, and separate movie game were merged in PR #13; CI and Vercel preview checks passed. On 2026-10-14, the missing serving migration was applied and verified, the reviewed one-page import produced 20 eligible records, and all 20 were approved after the owner's approval. Production returned an answer-free puzzle with HTTP 200, and the daily schedule is persisted. Keep future imports gated on their own reviewed preview and explicit batch approval; review titles before approval and preserve TMDB attribution, expiry, and purge safeguards. See [the source evaluation](./docs/source-evaluation.md) and [the current handoff](./progress.md).

### Gameplay feedback and autocomplete follow-up

The in-progress UI feature provides keyboard-operable approved-title suggestions for anime and movies. For a wrong guess that uniquely matches a catalog title, the API compares only shared metadata: anime genre/year/format/episodes/studio/content rating and movie genre/year. Shared genres and studios can match; year and episode differences communicate direction without exposing the answer's exact values. Free-form, unknown, or ambiguous guesses remain valid but do not receive field comparisons. The shared UI uses a quiet neutral palette, a small transparent-backed TMDB mark, and a subtle green match treatment. This work is not deployed; validate it and obtain owner approval through a PR before merge/deployment.

Acceptance criteria for each new source:

- The source and vertical are explicitly selected after terms and reuse review.
- A separate adapter maps provider data into the canonical media model and preserves provider IDs, provenance, and snapshots.
- Provider-specific fields are used as clues only when their accuracy and permitted use are understood.
- Duplicate/cross-provider matches are reviewed explicitly rather than automatically merged.
- Import, mapping, validation, attribution, and failure behavior have focused tests.
- Define eligibility independently for each provider; the player request path never calls the provider directly.
- Before public TMDB display, verify the migration providing the required logo/notice, original-content six-month expiry, hourly expiry purge, and correction/removal/full-purge operations; verify Vercel behavior with an eligible approved movie.
- Keep movie assignments and routes distinct from the anime daily game; never mix media types in the anime schedule.
- Review the live dry-run mapping and rejection counts before any explicit, bounded `--apply` import.

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
