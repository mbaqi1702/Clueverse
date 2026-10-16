import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  queryResult: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

vi.mock("server-only", () => ({}));

import { getSupabaseGuessClues } from "./supabase-guess-clues";

let query: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");

  query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    ilike: vi.fn(),
    gt: vi.fn(),
    limit: vi.fn(),
  };
  Object.values(query).forEach((method) => method.mockReturnValue(query));
  query.then = vi.fn((resolve) =>
    Promise.resolve(supabaseMocks.queryResult()).then(resolve),
  );

  supabaseMocks.queryResult.mockReset().mockReturnValue({
    data: [{
      id: "guessed-id",
      title: "Known movie",
      release_year: 2020,
      media_genres: [{ genres: { name: "Horror" } }],
      media_sources: [{ provider: "tmdb", tmdb_content_expires_at: "2099-01-01" }],
    }],
    error: null,
  });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    from: vi.fn().mockReturnValue(query),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseGuessClues", () => {
  it("looks up a unique approved movie and maps only playable fields", async () => {
    await expect(getSupabaseGuessClues("Known movie", "answer-id", "movie")).resolves.toEqual([
      { label: "Genre", value: "Horror" },
      { label: "Release year", value: "2020" },
    ]);

    expect(query.eq).toHaveBeenCalledWith("media_type", "movie");
    expect(query.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(query.eq).toHaveBeenCalledWith("media_sources.provider", "tmdb");
    expect(query.neq).toHaveBeenCalledWith("id", "answer-id");
    expect(query.gt).toHaveBeenCalledWith(
      "media_sources.tmdb_content_expires_at",
      expect.any(String),
    );
    expect(query.limit).toHaveBeenCalledWith(2);
  });

  it("returns no comparison for an ambiguous exact title", async () => {
    supabaseMocks.queryResult.mockReturnValue({
      data: [{ id: "one" }, { id: "two" }],
      error: null,
    });

    await expect(getSupabaseGuessClues("Shared title", "answer-id", "movie")).resolves.toBeNull();
  });

  it("maps the available anime fields and relations", async () => {
    supabaseMocks.queryResult.mockReturnValue({
      data: [{
        id: "guessed-anime-id",
        title: "Known anime",
        release_year: 2021,
        episode_count: 12,
        format: "TV",
        content_rating: "PG-13",
        media_genres: [{ genres: { name: "Mystery" } }],
        media_studios: [{ studios: { name: "Studio A" } }],
      }],
      error: null,
    });

    await expect(getSupabaseGuessClues("Known anime", "answer-id", "anime")).resolves.toEqual([
      { label: "Genre", value: "Mystery" },
      { label: "Release year", value: "2021" },
      { label: "Format", value: "TV" },
      { label: "Episodes", value: "12" },
      { label: "Studio", value: "Studio A" },
      { label: "Content rating", value: "PG-13" },
    ]);
    expect(query.eq).not.toHaveBeenCalledWith("media_sources.provider", "tmdb");
  });

  it("compares only approved, complete Wikidata novel clue records", async () => {
    supabaseMocks.queryResult.mockReturnValue({
      data: [{
        id: "guessed-book-id",
        title: "Known novel",
        media_genres: [{ genres: { name: "Mystery" } }],
        media_book_details: { first_publication_year: 1900 },
        media_book_authors: [{ book_authors: { name: "A. Writer" } }],
        media_sources: [{ provider: "wikidata" }],
      }],
      error: null,
    });

    await expect(getSupabaseGuessClues("Known novel", "answer-id", "book")).resolves.toEqual([
      { label: "Genre", value: "Mystery" },
      { label: "Publication year", value: "1900" },
      { label: "Author", value: "A. Writer" },
    ]);

    expect(query.eq).toHaveBeenCalledWith("format", "novel");
    expect(query.eq).toHaveBeenCalledWith("media_sources.provider", "wikidata");
  });
});
