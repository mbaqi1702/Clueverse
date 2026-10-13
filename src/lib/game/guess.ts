import { dailyPuzzle, type Clue, type DailyPuzzle } from "./content";

export type GuessResult =
  | { correct: true; completed: true; answer: string }
  | {
      correct: false;
      completed: boolean;
      clue?: Clue;
      answer?: string;
      comparison?: GuessComparison;
    };

export type GuessComparisonField = {
  label: string;
  guessValue: string;
  result: "match" | "different" | "answer-higher" | "answer-lower";
  detail: string;
};

export type GuessComparison = {
  available: boolean;
  fields: GuessComparisonField[];
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
  guessedClues?: Clue[],
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
    ...(guessedClues
      ? { comparison: compareGuessClues(puzzle.clues, guessedClues) }
      : {}),
    ...(completed ? { answer: puzzle.answer } : { clue: puzzle.clues[attemptNumber - 1] }),
  };
}

export function compareGuessClues(
  answerClues: Clue[],
  guessedClues: Clue[],
): GuessComparison {
  const fields = answerClues.flatMap((answerClue): GuessComparisonField[] => {
    const guessedClue = guessedClues.find(
      (clue) => clue.label.toLocaleLowerCase("en") === answerClue.label.toLocaleLowerCase("en"),
    );
    if (!guessedClue) return [];

    const label = answerClue.label;
    const guessValue = guessedClue.value;
    const answerValue = answerClue.value;

    if (label === "Genre" || label === "Studio") {
      const answerValues = splitAttributeValues(answerValue);
      const guessValues = splitAttributeValues(guessValue);
      const matches = guessValues.filter((value) =>
        answerValues.some((answer) => normalizeGuess(answer) === normalizeGuess(value)),
      );
      return [{
        label,
        guessValue,
        result: matches.length > 0 ? "match" : "different",
        detail: matches.length > 0 ? `Matches: ${matches.join(", ")}` : "No shared values",
      }];
    }

    if (label === "Release year" || label === "Episodes") {
      const answerNumber = Number(answerValue);
      const guessNumber = Number(guessValue);
      if (Number.isFinite(answerNumber) && Number.isFinite(guessNumber)) {
        if (answerNumber === guessNumber) {
          return [{ label, guessValue, result: "match", detail: "Exact match" }];
        }
        const answerHigher = answerNumber > guessNumber;
        return [{
          label,
          guessValue,
          result: answerHigher ? "answer-higher" : "answer-lower",
          detail: label === "Release year"
            ? answerHigher ? "Answer is newer" : "Answer is older"
            : answerHigher ? "Answer has more episodes" : "Answer has fewer episodes",
        }];
      }
    }

    const matches = normalizeGuess(answerValue) === normalizeGuess(guessValue);
    return [{
      label,
      guessValue,
      result: matches ? "match" : "different",
      detail: matches ? "Exact match" : "Different",
    }];
  });

  return { available: true, fields };
}

function splitAttributeValues(value: string): string[] {
  return value.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
}
