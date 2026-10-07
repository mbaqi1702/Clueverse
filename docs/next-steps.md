# ClueVerse post-launch next steps

Last updated: 2026-10-08 00:56 UTC+3

This is the current operational handoff. PRs #3, #5, and #6 are merged. The Tenrai catalog and daily-assignment migration are in place, Vercel Production is configured to use Supabase, and the public API has been checked.

## Current production state

- Production site: [clueverse-phi.vercel.app](https://clueverse-phi.vercel.app/).
- Vercel's project framework was corrected to Next.js after the production alias returned `404 NOT_FOUND`; the latest main deployment is Ready and aliased to the production hostname.
- Production uses `GAME_DATA_SOURCE=supabase`. Supabase URL and server secret were already configured in Vercel; no secret values belong in docs or client code.
- The project owner confirmed applying `20261007000100_enable_daily_random_anime.sql`.
- The catalog has 2,296 usable Tenrai records from the approved top-100-page import; 204 entries were rejected by mapper validation. No per-title approval is required for Tenrai records that meet automatic eligibility rules.
- Fullmetal Alchemist: Brotherhood was explicitly scheduled for `2026-10-08` UTC. Other dates are assigned and persisted on the first game API request for that UTC date, preferring a title not previously used.
- Daily dates change at 00:00 UTC, which is 03:00 at UTC+3. At 00:55 on October 8 local time, the API correctly still served the October 7 UTC assignment.
- Live checks confirmed repeated requests return the same puzzle ID for the day, the initial response omits the answer and clues, and an incorrect guess reveals one clue. The footer-label correction from PR #6 is merged and deployed.
- Tenrai is the only integrated provider. Imports remain explicit operator actions (`--apply`); automatic title eligibility is not automatic API polling or scheduled ingestion.

## Prioritized next steps

### 1. Verify the October 8 UTC puzzle transition

After 03:00 local time at UTC+3:

1. Open the production site and confirm it loads the daily puzzle.
2. Request `/api/game/today` twice and confirm the same puzzle ID and date are returned both times.
3. In the Supabase SQL Editor, verify the persisted date assignment:

   ```sql
   select dp.puzzle_date, dp.status, m.title, m.review_status
   from public.daily_puzzles dp
   join public.media m on m.id = dp.media_id
   where dp.puzzle_date = date '2026-10-08';
   ```

   It should retain Fullmetal Alchemist: Brotherhood, the puzzle explicitly scheduled for this date.
4. Submit a deliberately incorrect guess and confirm only the next clue is returned. Confirm the answer is revealed only after the game reaches its normal completion state.
5. Record any synopsis, alias, clue, rating, or rendering issue for follow-up.

The UTC date can be checked from the API response's `date` field; do not use the visitor's local calendar date as the assignment key.

### 2. Monitor catalog quality and repair issues

- Check the count of Tenrai rows that are approved/eligible and the count still pending after the migration. Record measured counts rather than assuming all 2,296 pass.
- Sample selected puzzles for synopsis accuracy, answer/title leakage, useful clues, aliases, and content-rating behavior.
- Decide how to reject or correct a problematic title and how to handle a puzzle already assigned for a date. Do not silently change an active daily assignment.
- Keep the current rating rule explicit: records marked Rx/Hentai are excluded; the automatic gate is a technical data-quality/content-rating filter, not a human content review.

### 3. Decide on Tenrai refresh operations

The importer is still manual and requires `--apply`; it does not fetch data on a schedule. Before automating refreshes, verify current source terms, Tenrai availability/rate limits, the desired refresh cadence, retry/alerting behavior, and how corrections/removals propagate. Preserve puzzle assignments and approved canonical content during refreshes.

### 4. Select the next provider only after choosing a vertical

No TMDB, Google Books, or manga source is implemented. Choose the next vertical based on player interest, then review that provider's current data-use terms, attribution, rate limits, and credential requirements before building an adapter. TMDB (movies/TV) and Google Books (books) are candidates, not cleared sources. Each provider needs its own mapper, tests, provenance, and eligibility rules; Tenrai auto-approval must not be generalized to other providers.

### 5. Improve the player experience based on actual use

Anonymous play currently keeps attempts in client memory, so refreshing resets a round. Collect player feedback on puzzle quality and usability first, then decide whether to prioritize durable progress, sharing, accessibility polish, or another media vertical. Avoid accounts, analytics, or new infrastructure until a clear need is established.

## Carryover prompt

> Continue ClueVerse from `main`. PRs #3, #5, and #6 are merged. Production at https://clueverse-phi.vercel.app/ is configured for Supabase mode; the project owner confirmed the daily-random migration is applied. The app persists one random eligible anime per UTC date and preserves explicitly scheduled puzzles. Verify the October 8 UTC assignment after 03:00 UTC+3 (Fullmetal Alchemist: Brotherhood is explicitly scheduled), check puzzle/API privacy and clue progression, then report verified catalog eligibility counts and any data-quality issues. Do not change production settings or run a Tenrai import without explicit approval. Only Tenrai is integrated; propose one additional provider/vertical for terms review before implementing it. See `docs/next-steps.md`, `docs/data-pipeline.md`, `milestones.md`, and `progress.md`.
