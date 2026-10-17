# Daily anime puzzle — prototype specification

## User outcome

A visitor can open the daily puzzle, read its opening synopsis, submit an anime title, receive progressively revealed clues after incorrect guesses, and see whether they solved it within five attempts.

## Acceptance criteria

- The initial puzzle response contains the synopsis and attempt limit, but not the answer, accepted guesses, or unrevealed clues.
- Guesses are submitted to a server route, normalized for case, punctuation, whitespace, and diacritics, and checked against the answer and configured aliases.
- An incorrect guess reveals one additional clue. A correct answer completes the round; the fifth incorrect guess ends it and reveals the answer.
- A player can skip instead of entering a title; skipping consumes one attempt and reveals the next clue. Skipping the final attempt ends the round and reveals the answer.
- In Supabase mode, a playable approved anime is randomly assigned and persisted per UTC date; every player receives the same title for that date.
- Existing scheduled puzzles are preserved. New assignments prefer eligible titles not used on earlier dates.
- Technically playable Tenrai imports become eligible automatically; other sources require their own eligibility policy.
- Explicit Rx/Hentai-rated titles are excluded from public daily assignment.
- Invalid JSON, empty or oversized guesses, and out-of-range attempt numbers receive a 400 response.
- The UI works at mobile and desktop widths, supports keyboard submission, reports loading/errors, and respects reduced-motion preferences.
- In database mode, approved anime title suggestions are keyboard-operable, exclude the active answer, and selecting a suggestion does not submit a guess.
- For a wrong guess that uniquely matches an approved catalog title, show comparisons only for shared anime fields. Genre/studio matches are explicit; year/episode hints reveal direction only, never the answer's exact values. Unknown or ambiguous titles remain valid guesses without field comparisons.
- A skipped attempt is visibly recorded as “Skipped” and never triggers a guessed-title comparison.
- Guesses and unlocked clues resume after refresh in the same browser for that game and UTC puzzle date; progress is not synchronized across devices or stored as an account/server record.
- Unit tests cover normalization, matching, clue progression, completion, attempt limits, and answer privacy.

## Data and scope

Sample mode uses one original, fictional puzzle held server-side. Supabase mode serves the catalog through a server-only database connection. Tenrai records become eligible automatically only if their synopsis and clue data meet the playability rules and their rating is not Rx/Hentai; incomplete or explicitly adult-rated records are excluded from daily selection. Anime comparisons use only fields available on both titles; movies have a separate daily-game specification and currently compare genre and release year only. Round progress is stored locally in the browser, scoped by vertical and puzzle date; it is not an authoritative server record or synced across devices. Images are not imported.

Out of scope: accounts, durable attempts, leaderboards, automatic provider ingestion schedules, media images, analytics, and additional game modes. Additional media sources are planned separately; each needs its own terms, attribution, adapter, and eligibility review. See [the data pipeline guide](../data-pipeline.md).
