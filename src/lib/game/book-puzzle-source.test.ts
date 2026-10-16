import { describe, expect, it, vi } from "vitest";
import { dailyBookPuzzle } from "./content";
import { getBookPuzzleForDate } from "./book-puzzle-source";

describe("getBookPuzzleForDate", () => {
  it("uses the original fictional puzzle in sample mode", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "sample");
    await expect(getBookPuzzleForDate("2026-10-16")).resolves.toBe(dailyBookPuzzle);
    vi.unstubAllEnvs();
  });

  it("rejects unknown data sources instead of falling back to a sample", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "invalid");
    await expect(getBookPuzzleForDate("2026-10-16")).rejects.toThrow("GAME_DATA_SOURCE");
    vi.unstubAllEnvs();
  });
});
