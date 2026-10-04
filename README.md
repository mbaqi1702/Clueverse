# ClueVerse

A daily media-guessing game. The first milestone is an anime puzzle with progressive clues.

## Local development

Requirements: Node.js 22 or later and npm.

```bash
npm ci
npm run dev
```

The prototype puzzle is original sample content stored in server-side code. It does not yet require Supabase credentials or any external content API. Do not commit `.env.local` or other secret files.

`.env.example` lists the expected environment variable names without secret values. The local Jikan importer reads `.env.local`; keep `SUPABASE_SECRET_KEY` server-side only.

## Checks

```bash
npm test
npm run lint
npm run build
```

## Product specification

See [the daily anime puzzle spec](./docs/specs/daily-anime-puzzle.md). Before replacing the sample content with third-party media metadata, review the provider's current terms, attribution, image use, and redistribution rules.

See [the anime data pipeline](./docs/data-pipeline.md) for the Supabase catalog schema, Jikan import workflow, review gates, and caching plan.
