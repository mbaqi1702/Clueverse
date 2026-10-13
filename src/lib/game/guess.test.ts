import { describe, expect, it } from "vitest";
import { dailyPuzzle, getPublicPuzzle } from "./content";
import { compareGuessClues, evaluateGuess, normalizeGuess } from "./guess";

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

  describe("compareGuessClues", () => {
    it("marks shared genres and reports year direction without revealing the target year", () => {
      const result = compareGuessClues(
        [
          { label: "Genre", value: "Horror · Mystery" },
          { label: "Release year", value: "2024" },
        ],
        [
          { label: "Genre", value: "Horror · Comedy" },
          { label: "Release year", value: "2021" },
        ],
      );

      expect(result).toEqual({
        available: true,
        fields: [
          {
            label: "Genre",
            guessValue: "Horror · Comedy",
            result: "match",
            detail: "Matches: Horror",
          },
          {
            label: "Release year",
            guessValue: "2021",
            result: "answer-higher",
            detail: "Answer is newer",
          },
        ],
      });
    });

    it("compares only fields shared by the answer and guessed title", () => {
      const result = compareGuessClues(
        [
          { label: "Genre", value: "Mystery" },
          { label: "Studio", value: "Studio A" },
        ],
        [{ label: "Genre", value: "Comedy" }],
      );

      expect(result.fields).toEqual([
        {
          label: "Genre",
          guessValue: "Comedy",
          result: "different",
          detail: "No shared values",
        },
      ]);
    });

    it("compares episode counts directionally", () => {
      const result = compareGuessClues(
        [{ label: "Episodes", value: "12" }],
        [{ label: "Episodes", value: "24" }],
      );

      expect(result.fields[0]).toMatchObject({
        result: "answer-lower",
        detail: "Answer has fewer episodes",
      });
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
