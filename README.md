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

Anime is the first catalog. Tenrai is a third-party API serving MyAnimeList-sourced metadata; the project owner reports reviewing MyAnimeList's terms for the intended use. The Tenrai importer automatically approves records only when they have a sufficiently long synopsis, at least four playable clue attributes, and are not explicitly rated Rx/Hentai. Other provider integrations are not implemented and will require their own terms, attribution, and eligibility review. Images are not imported.

Production uses the Supabase catalog for its daily puzzle; local development defaults to the original fictional sample. Merged PRs #3 and #5 added server-only database serving, stable random daily assignment, and automatic eligibility for Tenrai entries that meet the documented data-quality/content-rating rules. The daily-random migration has been applied to the configured Supabase project, and Vercel Production has `GAME_DATA_SOURCE=supabase`. The imported top-100-page catalog contains 2,296 usable entries; no per-title approval is required for eligible Tenrai records, but each new import remains an explicit operator action using `--apply`. Only Tenrai is integrated. See [the data-pipeline guide](./docs/data-pipeline.md) and [next steps / handoff](./docs/next-steps.md).

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
```

## Spec-driven workflow

Every meaningful feature starts with a concise specification: user behavior, acceptance criteria, data/API changes, out-of-scope work, and tests. Work stays feature-sized and moves through:

1. Human-approved requirement and spec.
2. Tests for the acceptance criteria.
3. Bounded implementation.
4. Local tests, lint, and production build.
5. Pull request with CI, design notes, and a Vercel preview for UI changes.
6. Human review and merge; production deployment remains an explicit human-controlled step.

See [the daily puzzle specification](./docs/specs/daily-anime-puzzle.md), [progress / handoff notes](./progress.md), and the [post-launch next-steps handoff](./docs/next-steps.md).

## Current state

The responsive game, server-validated guessing flow, Supabase-backed production puzzle, and stable daily assignment are deployed. The already scheduled Fullmetal Alchemist: Brotherhood puzzle is served for 2026-10-08 UTC; subsequent dates are assigned from eligible records when first requested. PRs #3, #5, and #6 are merged. Current operational status and prioritized follow-up work are in [`progress.md`](./progress.md), [`milestones.md`](./milestones.md), and the [next-steps handoff](./docs/next-steps.md).
