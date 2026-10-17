import type { Clue, PublicPuzzle } from "./content";
import type { GuessComparison } from "./guess";

export type GameStatus = "playing" | "won" | "lost";

export type GuessRecord = {
  value: string;
  result: "wrong" | "correct" | "skipped";
  comparison?: GuessComparison;
};

export type RoundProgress = {
  guesses: GuessRecord[];
  clues: Clue[];
  status: GameStatus;
  answer: string;
};

function isGameStatus(value: unknown): value is GameStatus {
  return value === "playing" || value === "won" || value === "lost";
}

type PersistedRoundProgress = RoundProgress & {
  puzzleId: string;
  puzzleDate: string;
  maxAttempts: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isClue(value: unknown): value is Clue {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  );
}

function isComparison(value: unknown): value is GuessComparison {
  return (
    isRecord(value) &&
    typeof value.available === "boolean" &&
    Array.isArray(value.fields) &&
    value.fields.every(
      (field) =>
        isRecord(field) &&
        typeof field.label === "string" &&
        typeof field.guessValue === "string" &&
        ["match", "different", "answer-higher", "answer-lower"].includes(
          String(field.result),
        ) &&
        typeof field.detail === "string",
    )
  );
}

function isGuessRecord(value: unknown): value is GuessRecord {
  return (
    isRecord(value) &&
    typeof value.value === "string" &&
    value.value.length <= 100 &&
    ["wrong", "correct", "skipped"].includes(String(value.result)) &&
    (value.comparison === undefined || isComparison(value.comparison))
  );
}

export function getRoundProgressKey(
  vertical: "anime" | "movie" | "book",
  puzzle: PublicPuzzle,
): string {
  return [
    "clueverse",
    "round-progress",
    "v1",
    vertical,
    puzzle.date,
    encodeURIComponent(puzzle.id),
  ].join(":");
}

export function deserializeRoundProgress(
  serialized: string | null,
  puzzle: PublicPuzzle,
): RoundProgress | null {
  if (!serialized) return null;

  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (
    !isRecord(value) ||
    value.puzzleId !== puzzle.id ||
    value.puzzleDate !== puzzle.date ||
    value.maxAttempts !== puzzle.maxAttempts ||
    !Array.isArray(value.guesses) ||
    !value.guesses.every(isGuessRecord) ||
    !Array.isArray(value.clues) ||
    !value.clues.every(isClue) ||
    !isGameStatus(value.status) ||
    typeof value.answer !== "string" ||
    value.guesses.length > puzzle.maxAttempts
  ) {
    return null;
  }

  const guesses = value.guesses;
  const clues = value.clues;
  const status = value.status;

  if (
    status === "playing" &&
    (guesses.length >= puzzle.maxAttempts ||
      guesses.some((guess) => guess.result === "correct") ||
      clues.length !== guesses.length ||
      value.answer !== "")
  ) {
    return null;
  }
  if (
    status === "won" &&
    (guesses.length === 0 ||
      guesses[guesses.length - 1].result !== "correct" ||
      guesses.slice(0, -1).some((guess) => guess.result === "correct") ||
      clues.length !== guesses.length - 1 ||
      !value.answer.trim())
  ) {
    return null;
  }
  if (
    status === "lost" &&
    (guesses.length !== puzzle.maxAttempts ||
      guesses.some((guess) => guess.result === "correct") ||
      clues.length !== puzzle.maxAttempts - 1 ||
      !value.answer.trim())
  ) {
    return null;
  }

  return {
    guesses,
    clues,
    status,
    answer: value.answer,
  };
}

export function serializeRoundProgress(
  puzzle: PublicPuzzle,
  progress: RoundProgress,
): string {
  const value: PersistedRoundProgress = {
    puzzleId: puzzle.id,
    puzzleDate: puzzle.date,
    maxAttempts: puzzle.maxAttempts,
    ...progress,
  };
  return JSON.stringify(value);
}
