import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dailyPuzzle } from "@/lib/game/content";
import { GET, POST } from "./route";

const supabaseMocks = vi.hoisted(() => ({
  getPuzzleForDate: vi.fn(),
}));

vi.mock("@/lib/game/supabase-puzzle", () => ({
  getSupabasePuzzleForDate: supabaseMocks.getPuzzleForDate,
}));

beforeEach(() => {
  vi.stubEnv("GAME_DATA_SOURCE", "sample");
  supabaseMocks.getPuzzleForDate.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("today's game API", () => {
  it("does not reveal the answer or unrevealed clues in the initial response", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data).toHaveProperty("synopsis");
    expect(data).not.toHaveProperty("answer");
    expect(data).not.toHaveProperty("acceptedGuesses");
    expect(data).not.toHaveProperty("clues");
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/game/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
  });

  it.each([
    { guess: "", attemptNumber: 1 },
    { guess: "guess", attemptNumber: 0 },
    { guess: "guess", attemptNumber: 6 },
    { guess: "x".repeat(101), attemptNumber: 1 },
    { guess: "guess", attemptNumber: "1" },
  ])("rejects invalid guess payloads", async (body) => {
    const response = await POST(
      new Request("http://localhost/api/game/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns one clue for a wrong guess and no-store caching", async () => {
    const response = await POST(
      new Request("http://localhost/api/game/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess: "not the answer", attemptNumber: 1 }),
      }),
    );
    const data = await response.json();

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data).toMatchObject({ correct: false, completed: false });
    expect(data.clue).toHaveProperty("label");
    expect(data).not.toHaveProperty("answer");
  });

  it("does not fall back to the sample when Supabase has no scheduled puzzle", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "supabase");
    supabaseMocks.getPuzzleForDate.mockResolvedValue(null);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data).toHaveProperty("error");
    expect(data).not.toHaveProperty("synopsis");
    expect(supabaseMocks.getPuzzleForDate).toHaveBeenCalledOnce();
  });

  it("keeps the Supabase answer, aliases, and clues out of the initial response", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "supabase");
    supabaseMocks.getPuzzleForDate.mockResolvedValue(dailyPuzzle);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("synopsis", dailyPuzzle.synopsis);
    expect(data).not.toHaveProperty("answer");
    expect(data).not.toHaveProperty("acceptedGuesses");
    expect(data).not.toHaveProperty("clues");
  });
});
