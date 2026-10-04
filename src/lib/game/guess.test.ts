import { describe, expect, it } from "vitest";
import { dailyPuzzle, getPublicPuzzle } from "./content";
import { evaluateGuess, normalizeGuess } from "./guess";

describe("normalizeGuess", () => {
  it("ignores punctuation, spacing, and letter case", () => {
    expect(normalizeGuess(" The Lanterns—of Kisaragi! ")).toBe("thelanternsofkisaragi");
  });

  it("normalizes accented characters", () => {
    expect(normalizeGuess("Été")).toBe("ete");
  });
});

describe("evaluateGuess", () => {
  it("accepts a correct title and its configured alias", () => {
    expect(evaluateGuess("lanterns of kisaragi", 1)).toEqual({
      correct: true,
      completed: true,
      answer: dailyPuzzle.answer,
    });
  });

  it("reveals the next clue after an incorrect guess", () => {
    expect(evaluateGuess("not it", 1)).toEqual({
      correct: false,
      completed: false,
      clue: dailyPuzzle.clues[0],
    });
  });

  it("ends after the final attempt and reveals the answer", () => {
    expect(evaluateGuess("not it", dailyPuzzle.maxAttempts)).toEqual({
      correct: false,
      completed: true,
      answer: dailyPuzzle.answer,
    });
  });

  it("rejects attempt numbers outside the puzzle limits", () => {
    expect(() => evaluateGuess("not it", 0)).toThrow(RangeError);
    expect(() => evaluateGuess("not it", dailyPuzzle.maxAttempts + 1)).toThrow(RangeError);
  });

  it("keeps the answer and unrevealed clues out of the public puzzle", () => {
    const publicPuzzle = getPublicPuzzle(dailyPuzzle);
    expect(publicPuzzle).not.toHaveProperty("answer");
    expect(publicPuzzle).not.toHaveProperty("acceptedGuesses");
    expect(publicPuzzle).not.toHaveProperty("clues");
  });
});
