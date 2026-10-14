# ClueVerse progress and handoff

Last updated: 2026-10-14

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Anime is the first vertical. Movies, books, and manga are planned as separate daily games, not mixed into the anime puzzle. Prioritize accessible/mobile-friendly UX, low operating cost, and human approval for licensing, credentials, database writes, and production changes.

## Current repository state

- PRs #3, #5, #10, #11, #12, #13, and #14 are merged.
- PR #10 improved background/input contrast and removes the trailing MAL Rewrite editor suffix from public synopsis text.
- PR #11 added database-backed approved-anime title suggestions with keyboard selection. Suggestions do not include today's scheduled answer, and choosing one fills the guess field without submitting it.
- PR #14 extended approved-title suggestions to movies, added safe field-by-field wrong-guess comparisons for both games, and simplified the shared UI palette. Anime compares its available genre, year, format, episode, studio, and content-rating fields; movies compare genre and year only. It deliberately does not add a director comparison because director is not in the movie clue model.
- PR #14 is merged and its Vercel production deployment is Ready. A live smoke check on `https://clueverse-phi.vercel.app` returned answer-free puzzle payloads and confirmed suggestions plus available comparisons for both verticals.
- The next gameplay increment, now in progress on `feat/skip-reveal-attempt`, adds an accessible skip action for both verticals. It consumes one attempt, reveals the next clue, and a final skip ends the round and reveals the answer; validation and PR review are still pending.
- **Production domain check needed:** `https://clueverse.vercel.app` currently serves a different Vite single-page app (HTML shell) instead of this Next.js game. The current Vercel production deployment advertises `clueverse-phi.vercel.app`, `clueverse-mbaqi1702.vercel.app`, and `clueverse-git-main-mbaqi1702.vercel.app`. Confirm the intended public URL and domain assignment in Vercel before sharing or changing aliases; no alias change has been made.
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

1. **Resolve the public-domain mismatch:** decide whether `clueverse.vercel.app` should point at this app or whether `clueverse-phi.vercel.app` is the intended public URL. Make any Vercel alias/DNS change only after confirming ownership and the desired canonical domain; recheck `/`, `/movies`, and both APIs afterward.
2. **Run a player acceptance pass on the confirmed public URL:** check the suggestions and comparison experience on a real mobile device, keyboard-only navigation, screen-reader labels, and the TMDB attribution/footer. Collect player feedback before adding more features.
3. **Improve catalog depth deliberately:** the last verified movie catalog has 20 approved titles. Review a fresh no-write TMDB import preview and obtain explicit approval for a specific batch before any writes or title approvals. Do not start the next import automatically.
4. **Operate the live catalog:** monitor scheduled puzzle availability, comparison/suggestion errors, and TMDB expiry/purge behavior; refresh the anime catalog counts before relying on the older snapshot.
5. **After skip ships, defer larger product features until anonymous play is validated:** consider a shareable result next; keep accounts, persistent streaks, and leaderboards as separate decisions. Keep movies/books/manga as separate daily games and do not persist AniList data.

## Copyable handoff prompt for a new chat

```text
Continue ClueVerse from the latest origin/main. PR #14 (movie suggestions, field comparisons, and a refined shared UI), PR #13 (separate TMDB movie daily game), PR #11 (approved-anime title suggestions), and PR #10 (contrast/synopsis cleanup) are merged. The owner decided that movies, books, and manga should have separate daily games, not be mixed into the anime puzzle, and cleared TMDB for the intended non-AI-powered game use.

The movie vertical is merged; CI and Vercel deployments passed. On 2026-10-14, the missing movie-serving migration was applied and verified, a reviewed one-page TMDB batch was imported and approved (20 eligible movies), and both production APIs were verified serving answer-free puzzles with working suggestions and wrong-guess comparisons. One daily movie assignment is persisted.

The latest Vercel production deployment is live at `https://clueverse-phi.vercel.app` (also aliased to `clueverse-mbaqi1702.vercel.app` and `clueverse-git-main-mbaqi1702.vercel.app`). Warning: `https://clueverse.vercel.app` currently serves a different Vite app, so confirm and fix the intended public-domain mapping before sharing that URL. Do not change Vercel aliases or DNS without confirming the desired canonical domain.

Keep anime and movie behavior separate. Production movie serving is operational. For any future import, review the no-write preview and obtain separate explicit batch approval before using `--apply`; manually review titles before approving. Never ask me to paste secrets into chat.

Preserve required TMDB logo/notice, six-month cache expiry, correction/removal, and purge safeguards; don't use TMDB content in connection with AI features. Commercial use requires a separate written agreement. Next, resolve the public domain, complete a real-device/player acceptance check, then review (but do not apply) a fresh TMDB import preview before separately approving any batch.

Google Books is field-scoped research; Wikidata is secondary manga metadata only; AniList must not be used for persistent ingestion. Use Windows-style paths for commands. Keep unrelated untracked user files untouched.
```

## Workflow / cost habits

- Keep PRs feature-sized and ask for a small diff with changed files, tests, and risks summarized.
- Prefer targeted tests, CI, lint, build, and preview evidence over repeated broad reviews.
- Use 21st.dev search first; inspect usage/quota before paid retrieval or generation.
- Never commit `.env.local`, API keys, or Supabase secrets.
