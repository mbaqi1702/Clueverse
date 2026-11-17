import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getCharacterPuzzleForDate } from "@/lib/game/character-content";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daily character game API", () => {
  it("serves answer-free character puzzle data", async () => {
    const response = await GET();
    const puzzle = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(puzzle).toHaveProperty("synopsis");
    expect(puzzle).toHaveProperty("maxAttempts", 5);
    expect(puzzle).not.toHaveProperty("answer");
    expect(puzzle).not.toHaveProperty("acceptedGuesses");
    expect(puzzle).not.toHaveProperty("clues");
  });

  it("reveals authored clues after an incorrect answer", async () => {
    const puzzle = getCharacterPuzzleForDate(new Date().toISOString().slice(0, 10));
    const response = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the character", attemptNumber: 1 }),
    }));

    expect(await response.json()).toMatchObject({
      correct: false,
      completed: false,
      clue: puzzle.clues[0],
    });
  });

  it("accepts a character alias and keeps the answer private until completion", async () => {
    const puzzle = getCharacterPuzzleForDate(new Date().toISOString().slice(0, 10));
    const alias = puzzle.acceptedGuesses[0];
    const response = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: alias, attemptNumber: 1 }),
    }));

    expect(await response.json()).toEqual({
      correct: true,
      completed: true,
      answer: puzzle.answer,
    });
  });

  it("uses skips to reveal clues and rejects invalid attempts", async () => {
    const puzzle = getCharacterPuzzleForDate(new Date().toISOString().slice(0, 10));
    const skipResponse = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skip: true, attemptNumber: 1 }),
    }));

    expect(await skipResponse.json()).toMatchObject({
      skipped: true,
      clue: puzzle.clues[0],
    });

    const invalidResponse = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "x", attemptNumber: 6 }),
    }));
    expect(invalidResponse.status).toBe(400);
  });

  it("reveals the answer after the final failed attempt", async () => {
    const puzzle = getCharacterPuzzleForDate(new Date().toISOString().slice(0, 10));
    const response = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the character", attemptNumber: puzzle.maxAttempts }),
    }));

    expect(await response.json()).toMatchObject({
      correct: false,
      completed: true,
      answer: puzzle.answer,
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/game/characters/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
