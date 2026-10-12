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

Anime is the first catalog. Tenrai is a third-party API serving MyAnimeList-sourced metadata; the project owner reports reviewing MyAnimeList's terms for the intended use. The Tenrai importer automatically approves records only when they have a sufficiently long synopsis, at least four playable clue attributes, and are not explicitly rated Rx/Hentai. A bounded TMDB movie importer is also available, and the project owner reports applying its database migration. No live TMDB preview or data import has been run; TMDB attribution and retention/removal requirements must be implemented before displaying TMDB data publicly. Google Books remains field-scoped research; follow each provider's current terms and eligibility rules. Images are not imported.

The catalog currently contains 2,296 Tenrai anime records, 2,272 approved in the latest check (2026-10-12). The bounded TMDB movie importer exists, but there are no TMDB movie rows yet and a live preview is blocked on configuring `TMDB_API_KEY`. Movies, books, and manga are planned as separate daily games, not mixed into anime. The next implementation priority is a separate TMDB movie vertical; public use requires provider attribution and retention/removal safeguards. Imports still require an explicit `--apply`; source ingestion is not scheduled automatically. See the [data-pipeline guide](./docs/data-pipeline.md), [source evaluation](./docs/source-evaluation.md), and [current handoff](./progress.md).

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

The responsive puzzle, server-validated guesses, contrast improvements, and approved-anime title suggestions are implemented. Latest verified Supabase counts (2026-10-12): 2,296 anime rows, 2,272 approved, and zero TMDB movie rows. A bounded TMDB importer is available; its migration is reported applied, but a live API preview is blocked on local `TMDB_API_KEY` configuration. The next implementation priority is a separate TMDB movie daily game with attribution and retention/removal safeguards. See [`progress.md`](./progress.md), [`milestones.md`](./milestones.md), and [`docs/data-pipeline.md`](./docs/data-pipeline.md).
