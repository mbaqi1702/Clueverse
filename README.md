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
- Grow the catalog through source-specific importers, validation, human review, attribution, and scheduled refreshes.
- Use analytics and performance measurements to guide product and scaling decisions—not to add services preemptively.
- Continue improving the visual design and usability through preview deployments, real-device checks, accessibility reviews, and player feedback.

## Architecture and stack

- **Web app:** Next.js App Router, React, TypeScript, and Tailwind CSS.
- **UI workflow:** 21st.dev MCP for component discovery and selected component retrieval; adapt components to the product design system instead of generating unnecessary variants.
- **Database:** Supabase Postgres for the normalized media catalog, provenance, approved daily puzzle schedule, and later player data.
- **Hosting:** Vercel, with preview deployments for pull requests and production deployments from the protected default branch.
- **CI:** GitHub Actions runs tests, lint, and build on pushes to `main` and pull requests.
- **Data flow:** provider APIs/datasets → paged ingestion → normalization and validation → review queue in Supabase → human-approved puzzle schedule → ClueVerse game API → web UI.

The player request path must use our database, not depend on live provider APIs. Daily puzzle selection is stable for its date. Cache only public, answer-free responses; never cache a response containing the answer or unrevealed clues. Start without Redis or a separate worker service and add infrastructure only when measurements justify it.

The catalog schema is media-type aware but intentionally conservative. Common fields and shared attributes are typed; source IDs and snapshots preserve provenance. Provider-specific adapters map into the canonical model. Records that may refer to the same title are explicitly reviewed rather than automatically fuzzy-merged.

## Data and licensing

Anime is the first catalog. A Tenrai importer and Supabase schema are prepared. Tenrai is a third-party API serving MyAnimeList-sourced metadata; the project owner has reviewed MyAnimeList's terms for the intended use. Imported records remain pending review until individually curated and approved. Images are not imported.

The current gameplay prototype still uses one original fictional sample puzzle. The Supabase catalog schema and Tenrai importer are available; runtime database serving is being added separately in PR #3. The approved top-100-page import added 2,296 usable records to Supabase; records remain pending review until individually approved. The importer defaults to a no-write dry run; a real import requires an explicit `--apply` flag and separate human approval. See [the data-pipeline guide](./docs/data-pipeline.md) for the schema, import, review, refresh, and caching plan.

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

See [the daily puzzle specification](./docs/specs/daily-anime-puzzle.md) and [progress / handoff notes](./progress.md).

## Current state

The first responsive puzzle slice, server-validated guessing flow, and editorial UI redesign are implemented. The Supabase catalog contains 2,296 usable Tenrai records; one is approved and scheduled, while the rest await review. PR #3 adds the opt-in read-only runtime path and currently has merge conflicts. The game still defaults to its fictional sample puzzle. Current status is in [`progress.md`](./progress.md); staged database and source goals are in [`milestones.md`](./milestones.md).
