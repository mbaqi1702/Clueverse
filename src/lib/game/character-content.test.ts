import { describe, expect, it } from "vitest";
import { getCharacterPuzzleForDate } from "./character-content";

describe("getCharacterPuzzleForDate", () => {
  it("returns a stable character puzzle for a date and rotates across the curated set", () => {
    const first = getCharacterPuzzleForDate("2026-11-17");

    expect(getCharacterPuzzleForDate("2026-11-17")).toBe(first);
    expect(getCharacterPuzzleForDate("2026-11-18").id).not.toBe(first.id);
  });

  it("rejects invalid calendar dates", () => {
    expect(() => getCharacterPuzzleForDate("2026-02-30")).toThrow(RangeError);
  });

  it("keeps every curated clue authored and progressively useful", () => {
    for (const date of ["2026-11-17", "2026-11-18", "2026-11-19"]) {
      const puzzle = getCharacterPuzzleForDate(date);
      expect(puzzle.clues).toHaveLength(puzzle.maxAttempts - 1);
      expect(puzzle.synopsis).not.toContain(puzzle.answer);
      expect(puzzle.clues.every((clue) => clue.value.length > 10)).toBe(true);
    }
  });
});
