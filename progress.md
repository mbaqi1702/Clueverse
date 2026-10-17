# ClueVerse progress and handoff

Last updated: 2026-10-17

## Product aim

Build a polished daily media mystery game: players identify a title from a synopsis and progressively revealed clues. Anime is the first vertical. Movies, books, and manga are planned as separate daily games, not mixed into the anime puzzle. Prioritize accessible/mobile-friendly UX, low operating cost, and human approval for licensing, credentials, database writes, and production changes.

## Current repository state

- PRs #3, #5, #10, #11, #12, #13, #14, #15, #16, #17, #18, #19, #20, and #21 are merged.
- PR #10 improved background/input contrast and removes the trailing MAL Rewrite editor suffix from public synopsis text.
- PR #11 added database-backed approved-anime title suggestions with keyboard selection. Suggestions do not include today's scheduled answer, and choosing one fills the guess field without submitting it.
- PR #14 extended approved-title suggestions to movies, added safe field-by-field wrong-guess comparisons for both games, and simplified the shared UI palette. Anime compares its available genre, year, format, episode, studio, and content-rating fields; movies compare genre and year only. It deliberately does not add a director comparison because director is not in the movie clue model.
- PR #14 is merged and its Vercel production deployment is Ready. A live smoke check on `https://clueverse-phi.vercel.app` returned answer-free puzzle payloads and confirmed suggestions plus available comparisons for both verticals.
- PR #16 added an accessible skip action for both verticals. It consumes one attempt, reveals the next clue, and a final skip ends the round and reveals the answer. CI and Vercel checks passed; it is merged.
- PR #18 adds shareable, answer-free result summaries for both verticals, using native share when available and clipboard fallback. It is merged.
- PR #19 adds the bounded Wikidata CC0 novel-metadata importer and pending-review migration; PR #20 adds the separate `/books` game, original fictional sample, and guarded Supabase schedule. Database mode only accepts human-approved novels with original synopses. The importer stages English novel works with an author, genre, and publication year, but does not ingest descriptions or book text. A refreshed no-write preview found one eligible novel in ten candidates; zero records have been written, and neither Books migration has been applied.
- PR #21 resumes each vertical's guesses and unlocked clues after a refresh in the same browser, scoped to that UTC puzzle date. It stores local progress only—not account-based or server-authoritative attempt state.
- **Production domain check needed:** `https://clueverse.vercel.app` currently serves a different Vite single-page app (HTML shell) instead of this Next.js game. The current Vercel production deployment advertises `clueverse-phi.vercel.app`, `clueverse-mbaqi1702.vercel.app`, and `clueverse-git-main-mbaqi1702.vercel.app`. Confirm the intended public URL and domain assignment in Vercel before sharing or changing aliases; no alias change has been made.
- PR #7 is closed and was not merged; use this handoff and the current source documents instead.
- Initial puzzle responses keep answers and unrevealed clues server-side; revealed progress is saved locally in the browser for that game/date. Wrong guesses reveal clues and rounds end at the vertical's configured attempt limit.
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
- Google Books remains the preferred API candidate but its configured project's daily quota is zero; no API key is configured locally. The Wikidata book pilot is based on CC0 structured metadata, with a no-write search and staged importer; its live catalog migration and import still require operator review. Gutendex was not selected because the bounded sample included duplicates/audio and its access and territorial copyright terms need separate review. AniList is excluded from persistent ingestion under the screened terms.

## Immediate next steps

1. **Resolve the public-domain mismatch:** decide whether `clueverse.vercel.app` should point at this app or whether `clueverse-phi.vercel.app` is the intended public URL. Make any Vercel alias/DNS change only after confirming ownership and the desired canonical domain; recheck `/`, `/movies`, and both APIs afterward.
2. **Books pilot:** current step is review and explicit owner approval of the staging-schema migration. Then separately approve any bounded `--apply` batch; records remain pending review until a human writes an original synopsis and approves playable records. Apply the daily-scheduling migration only after an approved playable book exists, then test the separate `/books` API in preview before enabling production. No migration or import has been authorized/applied yet. For Google Books, first request positive project quota; do not retry while its daily quota is zero. See the [pipeline/runbook](./docs/data-pipeline.md#books-migration-and-rollout-order) and [pilot notes](./docs/google-books-pilot.md).
3. **Run a player acceptance pass on the confirmed public URL:** check the suggestions, comparisons, skip, and share actions on a real mobile device, keyboard-only navigation, screen-reader labels, and the TMDB attribution/footer. Collect player feedback before adding more features.
4. **Improve catalog depth deliberately:** the last verified movie catalog has 20 approved titles. Review a fresh no-write TMDB import preview and obtain explicit approval for a specific batch before any writes or title approvals. Do not start the next import automatically.
5. **Operate the live catalog:** monitor scheduled puzzle availability, comparison/suggestion errors, and TMDB expiry/purge behavior; refresh the anime catalog counts before relying on the older snapshot. Keep accounts, persistent streaks, and leaderboards deferred until anonymous play is validated; keep each media type in a separate daily game and do not persist AniList data.

## Copyable handoff prompt for a new chat

```text
Continue ClueVerse from the latest origin/main. PR #19 added the Wikidata novel metadata pilot; PR #20 added the separate Books daily game; PR #21 added local progress persistence. PR #16 added skip-to-reveal; PR #14 added movie suggestions, field comparisons, and a refined shared UI; PR #13 added the separate TMDB movie game; PR #11 added approved-anime title suggestions; PR #10 improved contrast/synopsis handling. The owner decided that movies, books, and manga should have separate daily games, not be mixed into the anime puzzle, and cleared TMDB for the intended non-AI-powered game use.

The movie vertical is merged; CI and Vercel deployments passed. On 2026-10-14, the missing movie-serving migration was applied and verified, a reviewed one-page TMDB batch was imported and approved (20 eligible movies), and both production APIs were verified serving answer-free puzzles with working suggestions and wrong-guess comparisons. PR #16 added skip-to-reveal; PR #18 added answer-free result sharing; PR #19 added the Wikidata novel importer; PR #20 added the separate sample-mode `/books` experience and guarded Supabase path; PR #21 added local per-date progress restoration across refreshes. No live book records or schema changes have been made. The refreshed October 17 no-write preview mapped one eligible novel from ten candidates and wrote zero records. Book migrations remain pending operator review/approval; see the [migration rollout runbook](./docs/data-pipeline.md#books-migration-and-rollout-order).

The latest Vercel production deployment is live at `https://clueverse-phi.vercel.app` (also aliased to `clueverse-mbaqi1702.vercel.app` and `clueverse-git-main-mbaqi1702.vercel.app`). Warning: `https://clueverse.vercel.app` currently serves a different Vite app, so confirm and fix the intended public-domain mapping before sharing that URL. Do not change Vercel aliases or DNS without confirming the desired canonical domain.

Keep anime, movie, and book games separate. Production movie serving is operational. Google Books' configured project has a zero daily quota; don't retry until an operator enables it. The Wikidata Books importer only reads CC0 structured metadata and runs no-write by default. Review its preview/migration and obtain explicit approval for each batch before `--apply`; imported records stay pending review. The feature branch contains a playable fictional-sample `/books` game and a separate database-backed path; no live book schema/content has been applied. For TMDB, review the no-write preview and obtain separate batch approval before `--apply`; manually review titles before approving. Never ask me to paste secrets into chat.

Preserve required TMDB logo/notice, six-month cache expiry, correction/removal, and purge safeguards; don't use TMDB content in connection with AI features. Commercial use requires a separate written agreement. Next, resolve the public domain, complete a real-device/player acceptance check, then review (but do not apply) a fresh TMDB import preview before separately approving any batch.

Wikidata is used in the Books pilot only for CC0 structured novel metadata and remains a separate secondary manga metadata candidate. Google Books remains quota-blocked; AniList must not be used for persistent ingestion. Use Windows-style paths for commands. Keep unrelated local files untouched.
```

## Workflow / cost habits

- Keep PRs feature-sized and ask for a small diff with changed files, tests, and risks summarized.
- Prefer targeted tests, CI, lint, build, and preview evidence over repeated broad reviews.
- Use 21st.dev search first; inspect usage/quota before paid retrieval or generation.
- Never commit `.env.local`, API keys, or Supabase secrets.
