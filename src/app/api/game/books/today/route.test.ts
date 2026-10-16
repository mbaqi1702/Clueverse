import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const booksMocks = vi.hoisted(() => ({
  getBookPuzzleForDate: vi.fn(),
  getGuessClues: vi.fn(),
}));

vi.mock("@/lib/game/book-puzzle-source", () => ({
  getBookPuzzleForDate: booksMocks.getBookPuzzleForDate,
}));
vi.mock("@/lib/game/supabase-guess-clues", () => ({
  getSupabaseGuessClues: booksMocks.getGuessClues,
}));

import { GET, POST } from "./route";
import type { DailyPuzzle } from "@/lib/game/content";

const bookPuzzle: DailyPuzzle = {
  id: "book-id",
  answer: "Reviewed novel",
  acceptedGuesses: ["Alternate novel"],
  synopsis:
    "An original human-written synopsis of a reviewed novel, long enough to offer a fair opening clue and ready for the daily puzzle.",
  clues: [
    { label: "Genre", value: "Mystery" },
    { label: "Publication year", value: "1818" },
    { label: "Author", value: "A. Writer" },
  ],
  maxAttempts: 4,
};

beforeEach(() => {
  vi.stubEnv("GAME_DATA_SOURCE", "supabase");
  booksMocks.getBookPuzzleForDate.mockReset().mockResolvedValue(bookPuzzle);
  booksMocks.getGuessClues.mockReset().mockResolvedValue([
    { label: "Genre", value: "Fantasy" },
    { label: "Publication year", value: "1900" },
    { label: "Author", value: "Other Writer" },
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("book daily game API", () => {
  it("serves only answer-free public book fields", async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data.synopsis).toBe(bookPuzzle.synopsis);
    expect(data.maxAttempts).toBe(4);
    expect(data).not.toHaveProperty("answer");
    expect(data).not.toHaveProperty("acceptedGuesses");
    expect(data).not.toHaveProperty("clues");
  });

  it("reveals the next private clue for a wrong guess", async () => {
    const response = await POST(new Request("http://localhost/api/game/books/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the answer", attemptNumber: 1 }),
    }));
    const data = await response.json();

    expect(data).toMatchObject({
      correct: false,
      completed: false,
      clue: bookPuzzle.clues[0],
      comparison: { available: true },
    });
    expect(data).not.toHaveProperty("answer");
    expect(booksMocks.getGuessClues).toHaveBeenCalledWith("not the answer", "book-id", "book");
  });

  it("uses a skipped attempt to reveal a clue without comparing a title", async () => {
    const response = await POST(new Request("http://localhost/api/game/books/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skip: true, attemptNumber: 1 }),
    }));
    const data = await response.json();

    expect(data).toMatchObject({ skipped: true, clue: bookPuzzle.clues[0] });
    expect(data).not.toHaveProperty("answer");
    expect(booksMocks.getGuessClues).not.toHaveBeenCalled();
  });

  it("reveals the answer after the final book attempt", async () => {
    const response = await POST(new Request("http://localhost/api/game/books/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skip: true, attemptNumber: bookPuzzle.maxAttempts }),
    }));
    const data = await response.json();

    expect(data).toMatchObject({
      correct: false,
      completed: true,
      skipped: true,
      answer: bookPuzzle.answer,
    });
  });

  it("rejects attempt numbers beyond the book limit", async () => {
    const response = await POST(new Request("http://localhost/api/game/books/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the answer", attemptNumber: 5 }),
    }));
    expect(response.status).toBe(400);
  });

  it("does not fall back to a sample puzzle when book database mode is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    booksMocks.getBookPuzzleForDate.mockRejectedValue(new Error("No scheduled novel"));
    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Today's book puzzle is currently unavailable. Please try again later.",
    });
  });
});
