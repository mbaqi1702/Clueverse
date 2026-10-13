# ClueVerse progress and handoff

Last updated: 2026-10-14

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Anime is the first vertical. Movies, books, and manga are planned as separate daily games, not mixed into the anime puzzle. Prioritize accessible/mobile-friendly UX, low operating cost, and human approval for licensing, credentials, database writes, and production changes.

## Current repository state

- PRs #3, #5, #10, #11, #12, and #13 are merged.
- PR #10 improved background/input contrast and removes the trailing MAL Rewrite editor suffix from public synopsis text.
- PR #11 added database-backed approved-anime title suggestions with keyboard selection. Suggestions do not include today's scheduled answer, and choosing one fills the guess field without submitting it.
- The current local feature branch is adding the same title suggestions to movies and field-by-field wrong-guess comparisons for both verticals. The implementation uses only shared catalog fields, leaves answer metadata server-side, and does not add director comparisons (director is not in the movie clue model). This work is not yet in a PR or deployed.
- PR #7 remains open with conflicts and outdated launch documentation; do not merge it as-is. Use this handoff and the current source documents instead.
- Answers and unrevealed clues stay server-side; wrong guesses reveal clues and rounds end after five attempts.
- The UI has loading/error states, keyboard form submission, reduced-motion support, landmarks, and a skip link.
- GitHub Actions CI runs tests, lint, and build.
- `.env.local` is ignored by Git. `.env.example` contains variable names only. Never print, commit, or share secret values.

## Data status

- The catalog and Tenrai migrations are present in the configured Supabase project. On 2026-10-14, the daily TMDB movie migration was applied; assignment/purge functions, expiry safeguards, and the hourly purge job were verified.
- The project owner reports reviewing MyAnimeList terms for the intended use and selected Tenrai for anime. Tenrai writes require explicit `--apply`.
- **Catalog check 2026-10-14:** 20 TMDB movie rows, all approved; one daily movie assignment is persisted. Anime counts last checked 2026-10-12: 2,296 rows, 2,272 approved.
- The reviewed TMDB no-write preview returned 20 fetched, 20 usable, and 0 rejected. The owner approved the one-page import and the eligible titles; 20 records were written and approved.
- PR #13 (separate movie game) is merged, and CI/Vercel preview checks passed. The owner cleared TMDB for the intended non-AI-powered game use. The importer, separate movie route/schedule, attribution, six-month expiry, and purge/correction safeguards are implemented and verified. Production `/movies` loads; the API returns an answer-free puzzle, and a wrong guess reveals only the current clue.
- Movie requests require `GAME_DATA_SOURCE=supabase` and server-only Supabase credentials in the target Vercel environment. Empty or unapproved catalog data returns 503; the client now distinguishes that server response from an actual network connection failure.
- Fullmetal Alchemist: Brotherhood (Tenrai/MAL ID `5114`) was verified scheduled for `2026-10-08`; check live assignments before relying on historical schedule details.
- The owner chose separate daily games per media vertical. Keep movies, books, and manga out of the anime daily puzzle.
- Google Books is a field-scoped candidate; Wikidata is a secondary manga metadata source; AniList is excluded from persistent ingestion under the screened terms.

## Immediate next steps

1. Finish focused tests, full tests, lint, typecheck, production build, and local browser checks for the in-progress movie autocomplete and field-comparison UI.
2. Update the design/data documentation and inspect the final diff without disturbing unrelated local files.
3. If validation succeeds, create a reviewable PR and share its link for owner approval before merging or deploying this UI/gameplay work.
4. Continue monitoring live movie content expiry; investigate any future unavailable response via Vercel function logs. Keep future TMDB imports separately approved and title-reviewed, and maintain attribution, correction/removal, and purge safeguards.
5. Keep movie behavior and schedules separate from anime. Assess Google Books only for explicitly permitted fields and Wikidata as metadata enrichment for a separate manga game. Do not persist AniList data.

## Copyable handoff prompt for a new chat

```text
Continue ClueVerse from the latest origin/main. PR #13 (separate TMDB movie daily game), PR #11 (approved-anime title suggestions), and PR #10 (contrast/synopsis cleanup) are merged. The owner decided that movies, books, and manga should have separate daily games, not be mixed into the anime puzzle, and cleared TMDB for the intended non-AI-powered game use.

The movie vertical is merged; CI and the Vercel preview passed. On 2026-10-14, the missing movie-serving migration was applied and verified, a reviewed one-page TMDB batch was imported and approved (20 eligible movies), and production `/movies` was verified serving an answer-free puzzle with working clue reveal. One daily movie assignment is persisted.

Keep anime and movie behavior separate. Production movie serving is operational. For any future import, review the no-write preview and obtain separate explicit batch approval before using `--apply`; manually review titles before approving. Never ask me to paste secrets into chat.

Preserve required TMDB logo/notice, six-month cache expiry, correction/removal, and purge safeguards; don't use TMDB content in connection with AI features. Commercial use requires a separate written agreement.

Google Books is field-scoped research; Wikidata is secondary manga metadata only; AniList must not be used for persistent ingestion. Use Windows-style paths for commands. Keep unrelated untracked user files untouched.
```

## Workflow / cost habits

- Keep PRs feature-sized and ask for a small diff with changed files, tests, and risks summarized.
- Prefer targeted tests, CI, lint, build, and preview evidence over repeated broad reviews.
- Use 21st.dev search first; inspect usage/quota before paid retrieval or generation.
- Never commit `.env.local`, API keys, or Supabase secrets.
