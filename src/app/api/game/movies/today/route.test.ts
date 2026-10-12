import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getPuzzleForDate: vi.fn(),
}));

vi.mock("@/lib/game/supabase-tmdb-movie-puzzle", () => ({
  getSupabaseTmdbMoviePuzzleForDate: supabaseMocks.getPuzzleForDate,
}));

import { GET, POST } from "./route";
import type { DailyPuzzle } from "@/lib/game/content";

const moviePuzzle: DailyPuzzle = {
  id: "movie-id",
  answer: "Reviewed movie",
  acceptedGuesses: ["Alternate movie title"],
  synopsis: "A sufficiently detailed synopsis for a reviewed movie puzzle, longer than eighty characters.",
  clues: [
    { label: "Genre", value: "Mystery" },
    { label: "Release year", value: "2024" },
  ],
  maxAttempts: 3,
};

beforeEach(() => {
  vi.stubEnv("GAME_DATA_SOURCE", "supabase");
  supabaseMocks.getPuzzleForDate.mockReset().mockResolvedValue(moviePuzzle);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("movie daily game API", () => {
  it("serves only public movie fields with no-store caching", async () => {
    const response = await GET();
    const data = await response.json();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data.synopsis).toBe(moviePuzzle.synopsis);
    expect(data.maxAttempts).toBe(3);
    expect(data).not.toHaveProperty("answer");
    expect(data).not.toHaveProperty("acceptedGuesses");
    expect(data).not.toHaveProperty("clues");
  });

  it("reveals only the current movie clue and withholds the answer until completion", async () => {
    const response = await POST(new Request("http://localhost/api/game/movies/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the answer", attemptNumber: 1 }),
    }));
    const data = await response.json();
    expect(data).toMatchObject({ correct: false, completed: false, clue: moviePuzzle.clues[0] });
    expect(data).not.toHaveProperty("answer");
  });

  it("rejects attempt numbers beyond the movie-specific limit", async () => {
    const response = await POST(new Request("http://localhost/api/game/movies/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: "not the answer", attemptNumber: 4 }),
    }));
    expect(response.status).toBe(400);
  });

  it("does not fall back to anime or sample content when movie mode is unavailable", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "sample");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(503);
    expect(data).not.toHaveProperty("synopsis");
    expect(supabaseMocks.getPuzzleForDate).not.toHaveBeenCalled();
  });
});
