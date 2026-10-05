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

Anime is the first catalog. A Jikan importer and Supabase schema are prepared, but Jikan is an unofficial API that scrapes MyAnimeList. Before publishing any provider-sourced synopsis, title, image, or other content, review the applicable terms, attribution, rate limits, and reuse permissions. Imported records remain pending review until cleared. No provider data or images should be assumed licensed for public display.

Gameplay defaults to one original fictional sample puzzle. An opt-in, server-only read path can serve an approved anime puzzle scheduled in Supabase when `GAME_DATA_SOURCE=supabase`; it does not write to the database and does not fall back to the sample if the scheduled puzzle is unavailable. The Jikan importer defaults to a no-write dry run; a real import requires an explicit `--apply` flag and human approval. See [the data-pipeline guide](./docs/data-pipeline.md) for the schema, import, review, refresh, and caching plan.

## Local development

Requirements: Node.js 22 or later and npm.

```bash
npm ci
npm run dev
```

The sample gameplay does not require Supabase credentials. `GAME_DATA_SOURCE` defaults to `sample`; set it to `supabase` only after an approved anime puzzle is scheduled for the current UTC date. Supabase mode reads approved, scheduled puzzle data server-side and returns an explicit unavailable response when the database is not configured or has no eligible puzzle; it does not fall back to sample content. The import script reads `.env.local` when you opt into importing. `.env.example` contains blank secret placeholders and the non-secret sample-mode default. Never commit `.env.local`, paste secret values into chat, expose `SUPABASE_SECRET_KEY` to browser code, or put it in a `NEXT_PUBLIC_*` variable.

Useful commands:

```bash
npm test
npm run lint
npm run build
npm run import:jikan                 # one-page dry run; does not write to Supabase
npm run import:jikan -- --apply      # explicit write; only after provider review
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

The first responsive puzzle slice and server-validated guessing flow are implemented. The Supabase catalog migration, Jikan import tooling, and an opt-in server-only read path for approved scheduled puzzles are in place. The default game still uses the fictional sample, and no Jikan data has been imported; provider rights still need human review. Current work and the next safe steps are recorded in [`progress.md`](./progress.md).
