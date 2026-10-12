# ClueVerse progress and handoff

Last updated: 2026-10-12

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Anime is the first vertical. Movies, books, and manga are planned as separate daily games, not mixed into the anime puzzle. Prioritize accessible/mobile-friendly UX, low operating cost, and human approval for licensing, credentials, database writes, and production changes.

## Current repository state

- PRs #3, #5, #10, and #11 are merged.
- PR #10 improved background/input contrast and removes the trailing MAL Rewrite editor suffix from public synopsis text.
- PR #11 added database-backed approved-anime title suggestions with keyboard selection. Suggestions do not include today's scheduled answer, and choosing one fills the guess field without submitting it.
- PR #7 remains open with conflicts and outdated launch documentation; do not merge it as-is. Use this handoff and the current source documents instead.
- Answers and unrevealed clues stay server-side; wrong guesses reveal clues and rounds end after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link.
- GitHub Actions CI runs tests, lint, and build.
- `.env.local` is ignored by Git. `.env.example` contains variable names only. Never print, commit, or share secret values.

## Data status

- The project owner reports applying the catalog/RLS, Tenrai, daily-random assignment, and TMDB migrations to the intended Supabase project. Verify the live migration state before new database writes.
- The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai for anime. Tenrai writes require explicit `--apply`.
- **Catalog counts checked 2026-10-12:** 2,296 anime rows, all associated with Tenrai; 2,272 anime rows are approved; 0 TMDB movie rows exist. These are point-in-time counts; refresh them before importing.
- A bounded TMDB movie importer and service-role RPC exist, but `TMDB_API_KEY` is not configured in the current local environment. No live TMDB dry run has been performed.
- TMDB attribution and cache-expiry, correction/removal, and purge safeguards are required before any TMDB-backed content is displayed publicly.
- Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) was verified scheduled for `2026-10-08`; check live assignments before relying on historical schedule details.
- The owner chose separate daily games per media vertical. Keep movies, books, and manga out of the anime daily puzzle.
- Google Books is a field-scoped candidate; Wikidata is a secondary manga metadata source; AniList is excluded from persistent ingestion under the screened terms.

## Immediate next steps

1. **Next implementation PR: launch a separate TMDB movies daily vertical.** Configure `TMDB_API_KEY` locally (never paste it into chat), run and review the no-write `npm run import:tmdb` preview, and recheck current provider terms.
2. Keep anime behavior unchanged. Add separate movie scheduling/serving, source-specific reviewed eligibility and clue rules, provenance, and focused tests. Never expose pending-review records or answers in public responses.
3. Implement the required TMDB logo/notice and applicable cache-expiry, correction/removal, and purge process before public display.
4. Do not run `--apply` without a reviewed preview and separate explicit batch approval. Verify the movie vertical in a Vercel preview before production.
5. After TMDB, assess Google Books for explicitly permitted fields and Wikidata as metadata enrichment for a separate manga game. Do not persist AniList data.

## Copyable handoff prompt for a new chat

```text
Continue ClueVerse from the latest origin/main. PR #11 (approved-anime title suggestions) and PR #10 (contrast/synopsis cleanup) are merged. The owner decided that movies, books, and manga should have separate daily games, not be mixed into the anime puzzle.

The next implementation PR must prioritize a separate TMDB movies daily vertical. A bounded TMDB importer and service-role migration already exist; the project owner reports applying the migration. A Supabase count check on 2026-10-12 found 2,296 Tenrai anime rows, 2,272 approved anime rows, and zero TMDB movie rows. Refresh counts before relying on them.

TMDB_API_KEY is not configured in the current local environment. First inspect the current code/docs and the existing TMDB importer. Ask me to configure the key in ignored .env.local before running the no-write `npm run import:tmdb` preview. Never ask me to paste secrets into chat. Do not run any importer with --apply or write to Supabase without a reviewed preview and separate explicit approval.

Implement the movie vertical without changing anime behavior: separate daily assignment/serving, explicit source-specific eligibility and clue rules, provenance, focused tests, and no answer/pending-review leakage. Before public display, implement the required TMDB logo/notice and cache-expiry, correction/removal, and purge handling; recheck current terms. Validate with tests, lint, build, and a Vercel preview, then open a PR and stop for my review/merge.

Google Books is field-scoped research; Wikidata is secondary manga metadata only; AniList must not be used for persistent ingestion. Use Windows-style paths for commands. Keep unrelated untracked user files untouched.
```

## Workflow / cost habits

- Keep PRs feature-sized and ask for a small diff with changed files, tests, and risks summarized.
- Prefer targeted tests, CI, lint, build, and preview evidence over repeated broad reviews.
- Use 21st.dev search first; inspect usage/quota before paid retrieval or generation.
- Never commit `.env.local`, API keys, or Supabase secrets.
