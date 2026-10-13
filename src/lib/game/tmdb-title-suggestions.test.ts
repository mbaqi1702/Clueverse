import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  assignmentMaybeSingle: vi.fn(),
  titleLimit: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

vi.mock("server-only", () => ({}));

import { getTmdbMovieTitleSuggestions } from "./tmdb-title-suggestions";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");

  const assignmentQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: supabaseMocks.assignmentMaybeSingle,
  };
  assignmentQuery.select.mockReturnValue(assignmentQuery);
  assignmentQuery.eq.mockReturnValue(assignmentQuery);
  assignmentQuery.in.mockReturnValue(assignmentQuery);

  const titleQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gt: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: supabaseMocks.titleLimit,
  };
  Object.values(titleQuery).forEach((method) => {
    if (typeof method === "function" && "mockReturnValue" in method) {
      method.mockReturnValue(titleQuery);
    }
  });
  titleQuery.limit = supabaseMocks.titleLimit;
  titleQuery.limit.mockReset();
  titleQuery.limit.mockResolvedValue({ data: [{ title: "Swapped" }], error: null });

  supabaseMocks.assignmentMaybeSingle.mockReset().mockResolvedValue({
    data: { media_id: "daily-answer-id" },
    error: null,
  });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    from: vi.fn((table: string) =>
      table === "daily_movie_puzzles" ? assignmentQuery : titleQuery,
    ),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getTmdbMovieTitleSuggestions", () => {
  it("searches approved, unexpired movies while excluding today's answer", async () => {
    await expect(getTmdbMovieTitleSuggestions("sw", "2026-10-14")).resolves.toEqual(["Swapped"]);

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[1].value;
    expect(titleQuery.eq).toHaveBeenCalledWith("media_type", "movie");
    expect(titleQuery.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(titleQuery.eq).toHaveBeenCalledWith("media_sources.provider", "tmdb");
    expect(titleQuery.neq).toHaveBeenCalledWith("id", "daily-answer-id");
    expect(titleQuery.gt).toHaveBeenCalledWith(
      "media_sources.tmdb_content_expires_at",
      expect.any(String),
    );
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "sw%");
    expect(titleQuery.limit).toHaveBeenCalledWith(8);
  });

  it("escapes wildcard characters in the search prefix", async () => {
    await getTmdbMovieTitleSuggestions("s%_", "2026-10-14");

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[1].value;
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "s\\%\\_%");
  });
});
