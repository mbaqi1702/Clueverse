# Daily anime puzzle — prototype specification

## User outcome

A visitor can open the daily puzzle, read its opening synopsis, submit an anime title, receive progressively revealed clues after incorrect guesses, and see whether they solved it within five attempts.

## Acceptance criteria

- The initial puzzle response contains the synopsis and attempt limit, but not the answer, accepted guesses, or unrevealed clues.
- Guesses are submitted to a server route, normalized for case, punctuation, whitespace, and diacritics, and checked against the answer and configured aliases.
- An incorrect guess reveals one additional clue. A correct answer completes the round; the fifth incorrect guess ends it and reveals the answer.
- Invalid JSON, empty or oversized guesses, and out-of-range attempt numbers receive a 400 response.
- The UI works at mobile and desktop widths, supports keyboard submission, reports loading/errors, and respects reduced-motion preferences.
- Unit tests cover normalization, matching, clue progression, completion, attempt limits, and answer privacy.

## Data and scope

The current mechanics prototype uses one original, fictional sample puzzle held server-side. It is not a production anime catalog. Imported Tenrai metadata remains pending review until curated and approved; images are not imported. User progress is in client memory only and can reset on refresh. A separate Supabase catalog schema and Tenrai importer exist, but the game is not connected to the catalog yet.

Out of scope for the first playable slice: accounts, durable attempts, leaderboards, automatic ingestion schedules, media images, analytics, and additional game modes. Catalog schema and a manual, dry-run-first importer are tracked separately in [the data pipeline guide](../data-pipeline.md).
