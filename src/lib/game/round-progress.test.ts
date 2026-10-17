import { describe, expect, it } from "vitest";
import type { PublicPuzzle } from "./content";
import {
  deserializeRoundProgress,
  getRoundProgressKey,
  serializeRoundProgress,
} from "./round-progress";

const puzzle: PublicPuzzle = {
  id: "daily-id",
  date: "2026-10-17",
  synopsis: "An original puzzle synopsis.",
  maxAttempts: 5,
};

describe("round progress persistence", () => {
  it("scopes saved progress to the vertical and daily puzzle", () => {
    expect(getRoundProgressKey("anime", puzzle)).not.toBe(
      getRoundProgressKey("movie", puzzle),
    );
    expect(getRoundProgressKey("book", puzzle)).toContain("2026-10-17");
  });

  it("round-trips an in-progress round without saving the answer", () => {
    const progress = {
      guesses: [{ value: "An incorrect title", result: "wrong" as const }],
      clues: [{ label: "Genre", value: "Mystery" }],
      status: "playing" as const,
      answer: "",
    };

    const restored = deserializeRoundProgress(
      serializeRoundProgress(puzzle, progress),
      puzzle,
    );

    expect(restored).toEqual(progress);
    expect(JSON.parse(serializeRoundProgress(puzzle, progress)).answer).toBe("");
  });

  it("restores a completed round and its answer", () => {
    const progress = {
      guesses: [
        { value: "A wrong title", result: "wrong" as const },
        { value: "The answer", result: "correct" as const },
      ],
      clues: [{ label: "Genre", value: "Mystery" }],
      status: "won" as const,
      answer: "The answer",
    };

    expect(
      deserializeRoundProgress(serializeRoundProgress(puzzle, progress), puzzle),
    ).toEqual(progress);
  });

  it("restores a lost round after its final attempt", () => {
    const progress = {
      guesses: Array.from({ length: puzzle.maxAttempts }, (_, index) => ({
        value: `Wrong title ${index + 1}`,
        result: "wrong" as const,
      })),
      clues: Array.from({ length: puzzle.maxAttempts - 1 }, (_, index) => ({
        label: `Clue ${index + 1}`,
        value: `Value ${index + 1}`,
      })),
      status: "lost" as const,
      answer: "The answer",
    };

    expect(
      deserializeRoundProgress(serializeRoundProgress(puzzle, progress), puzzle),
    ).toEqual(progress);
  });

  it("rejects malformed, mismatched, and impossible progress", () => {
    const impossible = JSON.stringify({
      puzzleId: puzzle.id,
      puzzleDate: puzzle.date,
      maxAttempts: puzzle.maxAttempts,
      guesses: [{ value: "Correct", result: "correct" }],
      clues: [],
      status: "playing",
      answer: "",
    });

    expect(deserializeRoundProgress("{", puzzle)).toBeNull();
    expect(deserializeRoundProgress(impossible, puzzle)).toBeNull();
    expect(
      deserializeRoundProgress(
        serializeRoundProgress(puzzle, {
          guesses: [],
          clues: [],
          status: "playing",
          answer: "",
        }),
        { ...puzzle, date: "2026-10-18" },
      ),
    ).toBeNull();
  });
});
