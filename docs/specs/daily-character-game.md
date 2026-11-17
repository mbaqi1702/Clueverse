# Daily character game — text-only pilot

## Player experience

Players identify a classic literary character from an original opening brief and up to four progressively more specific clues. They have five attempts; a wrong guess or skip reveals the next clue, and the final miss reveals the answer. Results can be shared without the answer.

## Content and sourcing

- The initial pilot uses a small, manually curated set of classic literary characters.
- Briefs and clues are original editorial copy, not copied or AI-paraphrased provider synopses or book passages.
- No portraits, cover art, audio, or other third-party media are included.
- Content is a prototype seed set, not a fully reviewed production catalog. Verify work/character rights for launch jurisdictions and expand only through a documented editorial/source review.
- Puzzles rotate deterministically by UTC date so all players see the same character each day.

## Privacy and validation

- The daily GET returns only the public brief, date, and attempt limit.
- Answers, aliases, and unrevealed clues remain server-side until play reveals them.
- Guesses use shared normalization; aliases are accepted; invalid JSON and out-of-range attempts are rejected.
- Progress is stored locally in the browser, scoped to this game and puzzle date.
- No AI request or third-party provider call occurs in the player request path.
