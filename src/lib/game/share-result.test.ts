import { describe, expect, it } from "vitest";
import { formatShareResult } from "./share-result";

describe("formatShareResult", () => {
  it("formats a solved anime result without including an answer", () => {
    expect(
      formatShareResult({
        vertical: "anime",
        date: "2026-10-16",
        status: "won",
        attempts: ["wrong", "skipped", "correct"],
        maxAttempts: 5,
      }),
    ).toBe(
      "ClueVerse - Anime - 2026-10-16\nSolved in 3/5 attempts\nResults: Miss, Skipped, Correct",
    );
  });

  it("formats an unsolved movie result", () => {
    expect(
      formatShareResult({
        vertical: "movie",
        date: "2026-10-16",
        status: "lost",
        attempts: ["wrong", "wrong", "skipped"],
        maxAttempts: 3,
      }),
    ).toBe(
      "ClueVerse - Movies - 2026-10-16\nNot solved in 3/3 attempts\nResults: Miss, Miss, Skipped",
    );
  });
});
