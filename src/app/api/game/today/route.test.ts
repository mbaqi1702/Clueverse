import { describe, expect, it } from "vitest";
import { GET, POST } from "./route";

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
});
