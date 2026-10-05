import { dailyPuzzle, type Clue, type DailyPuzzle } from "./content";

export type GuessResult =
  | { correct: true; completed: true; answer: string }
  | {
      correct: false;
      completed: boolean;
      clue?: Clue;
      answer?: string;
    };

export function normalizeGuess(guess: string): string {
  return guess
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function evaluateGuess(
  guess: string,
  attemptNumber: number,
  puzzle: DailyPuzzle = dailyPuzzle,
): GuessResult {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > puzzle.maxAttempts) {
    throw new RangeError("Attempt number is outside the allowed range.");
  }

  const normalizedGuess = normalizeGuess(guess);
  const accepted = [puzzle.answer, ...puzzle.acceptedGuesses].some(
    (answer) => normalizeGuess(answer) === normalizedGuess,
  );

  if (accepted) {
    return { correct: true, completed: true, answer: puzzle.answer };
  }

  const completed = attemptNumber === puzzle.maxAttempts;
  return {
    correct: false,
    completed,
    ...(completed ? { answer: puzzle.answer } : { clue: puzzle.clues[attemptNumber - 1] }),
  };
}
