# ClueVerse

ClueVerse is a daily media mystery game. Players identify a piece of media from a synopsis and progressively revealed clues, then compare their results with friends and the wider community. Anime is the first vertical; the long-term goal is to reuse the same game engine for films, television, books, manga, and other media.

The product should feel like a polished, welcoming consumer game while remaining fast, accessible, dependable, and inexpensive to operate. AI tools help us implement and review bounded work; product decisions and risky production changes remain human-approved.

## Product direction

### First playable release

- One daily anime puzzle with a synopsis, limited guesses, progressive clues, and a result state.
- Curated puzzle selection, normalized title/alias matching, and a shareable result.
- Responsive mobile-first layout, clear loading/error/empty states, keyboard support, and reduced-motion support.
- Anonymous play first. Accounts, streaks, saved history, and leaderboards follow only when the core game is enjoyable.

### Long-term direction

- Expand from anime into movies and TV, then books, manga, and other media.
- Add player accounts, streaks, personal history, social sharing, and optional global/friends leaderboards.
- Grow the catalog through source-specific importers, validation, eligibility rules, attribution, and controlled refreshes.
- Use analytics and performance measurements to guide product and scaling decisions—not to add services preemptively.
- Continue improving the visual design and usability through preview deployments, real-device checks, accessibility reviews, and player feedback.

## Architecture and stack

- **Web app:** Next.js App Router, React, TypeScript, and Tailwind CSS.
- **UI workflow:** 21st.dev MCP for component discovery and selected component retrieval; adapt components to the product design system instead of generating unnecessary variants.
- **Database:** Supabase Postgres for the normalized media catalog, provenance, approved daily puzzle schedule, and later player data.
- **Hosting:** Vercel, with preview deployments for pull requests and production deployments from the protected default branch.
- **CI:** GitHub Actions runs tests, lint, and build on pushes to `main` and pull requests.
- **Data flow:** provider APIs/datasets → paged ingestion → normalization and validation → source-specific eligibility → persisted daily puzzle assignment → ClueVerse game API → web UI.

The player request path must use our database, not depend on live provider APIs. Daily puzzle selection is stable for its date. Cache only public, answer-free responses; never cache a response containing the answer or unrevealed clues. Start without Redis or a separate worker service and add infrastructure only when measurements justify it.

The catalog schema is media-type aware but intentionally conservative. Common fields and shared attributes are typed; source IDs and snapshots preserve provenance. Provider-specific adapters map into the canonical model. Records that may refer to the same title are explicitly reviewed rather than automatically fuzzy-merged.

## Data and licensing

Anime is the first catalog. Tenrai is a third-party API serving MyAnimeList-sourced metadata; the project owner reports reviewing MyAnimeList's terms for the intended use. The Tenrai importer automatically approves records only when they have a sufficiently long synopsis, at least four playable clue attributes, and are not explicitly rated Rx/Hentai. The separate TMDB movie importer and daily game are implemented. The owner has cleared TMDB for the intended non-AI-powered game use; the integration keeps the required attribution, six-month expiry, correction/removal, and purge safeguards. The movie importer stages records for human approval and rejects records that lack a valid release year or known genre. Google Books remains blocked because its configured project's daily quota is zero. The separate `/books` game has an original fictional sample in sample mode and a bulk CC0 Wikidata novel-metadata importer. The catalog has 100 Wikidata novels: 17 approved and playable, with 83 awaiting editorial review. The daily Books schedule is live. See the [data pipeline](./docs/data-pipeline.md) and [Books pilot notes](./docs/google-books-pilot.md). Images are not imported.

The catalog contained 2,296 Tenrai anime records (2,272 approved) in the latest check. On 2026-10-14, 20 TMDB movies were imported and approved after review; the daily movie schedule was assigned and the production movie endpoint returned HTTP 200. The initial no-write preview returned 20 fetched, 20 usable, and 0 rejected. Movies, books, and manga are separate daily games, not mixed into anime. Future imports still require a reviewed preview and explicit approval before `--apply`; source ingestion is not scheduled automatically. See the [data-pipeline guide](./docs/data-pipeline.md), [source evaluation](./docs/source-evaluation.md), and [current handoff](./progress.md).

## Local development

Requirements: Node.js 22 or later and npm.

```bash
npm ci
npm run dev
```

The current sample gameplay does not require Supabase credentials. The import script reads `.env.local` when you opt into importing. `.env.example` lists variable names only. Never commit `.env.local`, paste secret values into chat, expose `SUPABASE_SECRET_KEY` to browser code, or put it in a `NEXT_PUBLIC_*` variable.

Useful commands:

```bash
npm test
npm run lint
npm run build
npm run import:tenrai                 # one-page dry run; does not write to Supabase
npm run import:tenrai -- --apply      # explicit write; requires separate approval
npm run import:tmdb                   # one-page dry run; requires TMDB_API_KEY
npm run import:tmdb -- --pages=2 --apply # explicit write after migration and review
```

## Spec-driven workflow

Every meaningful feature starts with a concise specification: user behavior, acceptance criteria, data/API changes, out-of-scope work, and tests. Work stays feature-sized and moves through:

1. Human-approved requirement and spec.
2. Tests for the acceptance criteria.
3. Bounded implementation.
4. Local tests, lint, and production build.
5. Pull request with CI, design notes, and a Vercel preview for UI changes.
6. Human review and merge; production deployment remains an explicit human-controlled step.

See [the daily puzzle specification](./docs/specs/daily-anime-puzzle.md) and [progress / handoff notes](./progress.md).

## Current state

The responsive puzzle, server-validated guesses, approved-title suggestions, and skip-to-reveal action are implemented for both anime and movies. Skipping uses one attempt and reveals the same next clue as an incorrect guess. Wrong guesses in database mode can show private, field-by-field comparisons: anime uses its available genre, year, format, episode, studio, and content-rating fields; movies use genre and release year only. PR #14 added suggestions/comparisons and PR #16 added skip-to-reveal; both are merged. The current Vercel production alias is [`clueverse-phi.vercel.app`](https://clueverse-phi.vercel.app); verify the intended canonical hostname before sharing, as `clueverse.vercel.app` currently serves a different Vite app. The separate TMDB movie game is merged in PR #13: 20 eligible movies were approved, a daily assignment is persisted, and the TMDB serving migration and expiry/purge protections are applied. See [`progress.md`](./progress.md), [`milestones.md`](./milestones.md), and [`docs/data-pipeline.md`](./docs/data-pipeline.md).
