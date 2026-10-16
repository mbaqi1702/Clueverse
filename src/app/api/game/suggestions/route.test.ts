import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const suggestionsMocks = vi.hoisted(() => ({
  getAnimeTitleSuggestions: vi.fn(),
  getMovieTitleSuggestions: vi.fn(),
  getBookTitleSuggestions: vi.fn(),
}));

vi.mock("@/lib/game/anime-title-suggestions", () => ({
  getAnimeTitleSuggestions: suggestionsMocks.getAnimeTitleSuggestions,
}));
vi.mock("@/lib/game/tmdb-title-suggestions", () => ({
  getTmdbMovieTitleSuggestions: suggestionsMocks.getMovieTitleSuggestions,
}));
vi.mock("@/lib/game/wikidata-book-title-suggestions", () => ({
  getWikidataBookTitleSuggestions: suggestionsMocks.getBookTitleSuggestions,
}));

beforeEach(() => {
  vi.stubEnv("GAME_DATA_SOURCE", "supabase");
  suggestionsMocks.getAnimeTitleSuggestions.mockReset();
  suggestionsMocks.getMovieTitleSuggestions.mockReset();
  suggestionsMocks.getBookTitleSuggestions.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("anime title suggestions API", () => {
  it("returns matching titles without caching and supports a one-letter query", async () => {
    suggestionsMocks.getAnimeTitleSuggestions.mockResolvedValue(["Attack on Titan"]);

    const response = await GET(new Request("http://localhost/api/game/suggestions?q=a"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(data).toEqual({ suggestions: ["Attack on Titan"] });
    expect(suggestionsMocks.getAnimeTitleSuggestions).toHaveBeenCalledWith(
      "a",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it("returns movie suggestions from the movie catalog", async () => {
    suggestionsMocks.getMovieTitleSuggestions.mockResolvedValue(["Swapped"]);

    const response = await GET(
      new Request("http://localhost/api/game/suggestions?vertical=movie&q=sw"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: ["Swapped"] });
    expect(suggestionsMocks.getMovieTitleSuggestions).toHaveBeenCalledWith(
      "sw",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
  });

  it("returns book suggestions from the approved novel catalog", async () => {
    suggestionsMocks.getBookTitleSuggestions.mockResolvedValue(["Reviewed novel"]);

    const response = await GET(
      new Request("http://localhost/api/game/suggestions?vertical=book&q=rev"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: ["Reviewed novel"] });
    expect(suggestionsMocks.getBookTitleSuggestions).toHaveBeenCalledWith(
      "rev",
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
    expect(suggestionsMocks.getMovieTitleSuggestions).not.toHaveBeenCalled();
  });

  it("rejects an unsupported vertical", async () => {
    const response = await GET(
      new Request("http://localhost/api/game/suggestions?vertical=tv&q=sh"),
    );

    expect(response.status).toBe(400);
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
    expect(suggestionsMocks.getMovieTitleSuggestions).not.toHaveBeenCalled();
  });

  it("does not query the database for a blank search", async () => {
    const response = await GET(new Request("http://localhost/api/game/suggestions?q=%20"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
  });

  it("rejects searches longer than the guess field limit", async () => {
    const query = "a".repeat(101);
    const response = await GET(
      new Request(`http://localhost/api/game/suggestions?q=${query}`),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
  });

  it("keeps sample mode independent of Supabase", async () => {
    vi.stubEnv("GAME_DATA_SOURCE", "sample");

    const response = await GET(new Request("http://localhost/api/game/suggestions?q=a"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ suggestions: [] });
    expect(suggestionsMocks.getAnimeTitleSuggestions).not.toHaveBeenCalled();
  });

  it("returns an explicit unavailable response when database search fails", async () => {
    suggestionsMocks.getAnimeTitleSuggestions.mockRejectedValue(new Error("Database offline"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("http://localhost/api/game/suggestions?q=a"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Title suggestions are temporarily unavailable.",
    });
  });
});
