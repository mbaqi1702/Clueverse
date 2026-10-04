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

The first release uses one original, fictional sample puzzle held server-side. It is a mechanics prototype, not a production anime catalog. Do not add external-provider descriptions, images, or credentials until data terms and attribution are reviewed. User progress is in client memory only and can reset on refresh.

Out of scope: accounts, durable attempts, leaderboards, ingestion jobs, media images, analytics, and additional game modes.
