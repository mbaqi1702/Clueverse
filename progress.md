# ClueVerse progress and handoff

Last updated: 2026-10-12

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Anime is the first vertical. Movies, books, and manga are planned as separate daily games, not mixed into the anime puzzle. Prioritize accessible/mobile-friendly UX, low operating cost, and human approval for licensing, credentials, database writes, and production changes.

## Current repository state

- PRs #3, #5, #10, #11, and #12 are merged.
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
- The latest no-write TMDB preview on 2026-10-12 returned 20 fetched, 20 mapped, 0 rejected, and 0 written after strict `adult: false` validation and the corrected attribution text. Review another no-write preview before any separately approved import.
- A separate movie route, schedule/RPC migration, source-specific eligibility/clue rules, TMDB logo/notice, six-month serving expiry, and operator purge functions are in this branch. Apply/verify the movie migration and explicitly approve reviewed records before the game can serve a puzzle. No database writes were made.
- Current TMDB terms require the official logo and exact prominent notice, a six-month maximum cache, prompt purge after access ends, and a separate written agreement for commercial use; they prohibit use of TMDB data with an AI-based application. Recheck before public rollout.
- Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) was verified scheduled for `2026-10-08`; check live assignments before relying on historical schedule details.
- The owner chose separate daily games per media vertical. Keep movies, books, and manga out of the anime daily puzzle.
- Google Books is a field-scoped candidate; Wikidata is a secondary manga metadata source; AniList is excluded from persistent ingestion under the screened terms.

## Immediate next steps

1. **Open the implementation PR for the separate TMDB movies daily vertical, then verify its Vercel preview.** The strict-adult no-write preview was reviewed; repeat it before any later import and never share the API key.
2. Keep anime behavior unchanged. Apply/verify the new movie migration and separately approve only reviewed records before movie play.
3. Do not run `--apply` without a reviewed preview and separate explicit batch approval. Verify the movie vertical in a Vercel preview before production; PR merge remains pending owner review.
4. Maintain TMDB attribution, expiry, correction/removal, and purge safeguards. Stop the integration if provider terms or permissions change.
5. After TMDB, assess Google Books for explicitly permitted fields and Wikidata as metadata enrichment for a separate manga game. Do not persist AniList data.

## Copyable handoff prompt for a new chat

```text
Continue ClueVerse from the latest origin/main. PR #11 (approved-anime title suggestions) and PR #10 (contrast/synopsis cleanup) are merged. The owner decided that movies, books, and manga should have separate daily games, not be mixed into the anime puzzle.

The separate TMDB movies daily vertical is implemented on `feat/tmdb-movie-daily`; open a PR and verify its Vercel preview. A bounded TMDB importer and service-role migration already exist; the project owner reports applying the importer migration. A Supabase count check on 2026-10-12 found 2,296 Tenrai anime rows, 2,272 approved anime rows, and zero TMDB movie rows. Refresh counts before relying on them.

The separate movie vertical is implemented on the feature branch. The latest no-write preview returned 20 fetched, 20 mapped, 0 rejected, and 0 written with strict adult-flag validation. Never ask me to paste secrets into chat. Do not run any importer with --apply or write to Supabase without a reviewed preview and separate explicit approval.

Keep movie and anime behavior separate. Validate the new movie migration, no-write importer preview, and Vercel preview before any public enablement. Recheck current terms, especially the restrictions on AI-based applications and commercial use. Focused tests, lint, and build pass on the branch; verify the Vercel preview, then stop for my review/merge.

Google Books is field-scoped research; Wikidata is secondary manga metadata only; AniList must not be used for persistent ingestion. Use Windows-style paths for commands. Keep unrelated untracked user files untouched.
```

## Workflow / cost habits

- Keep PRs feature-sized and ask for a small diff with changed files, tests, and risks summarized.
- Prefer targeted tests, CI, lint, build, and preview evidence over repeated broad reviews.
- Use 21st.dev search first; inspect usage/quota before paid retrieval or generation.
- Never commit `.env.local`, API keys, or Supabase secrets.
