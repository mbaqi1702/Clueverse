import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  assignPuzzle: vi.fn(),
  titleLimit: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

vi.mock("server-only", () => ({}));

import { getWikidataBookTitleSuggestions } from "./wikidata-book-title-suggestions";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");

  const titleQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: supabaseMocks.titleLimit,
  };
  titleQuery.select.mockReturnValue(titleQuery);
  titleQuery.eq.mockReturnValue(titleQuery);
  titleQuery.neq.mockReturnValue(titleQuery);
  titleQuery.ilike.mockReturnValue(titleQuery);
  titleQuery.order.mockReturnValue(titleQuery);

  supabaseMocks.assignPuzzle.mockReset().mockResolvedValue({
    data: "daily-answer-id",
    error: null,
  });
  supabaseMocks.titleLimit.mockReset().mockResolvedValue({
    data: [{ title: "Reviewed novel" }],
    error: null,
  });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    rpc: supabaseMocks.assignPuzzle,
    from: vi.fn(() => titleQuery),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getWikidataBookTitleSuggestions", () => {
  it("uses the daily puzzle assignment and searches approved novels without the answer", async () => {
    await expect(
      getWikidataBookTitleSuggestions("rev", "2026-11-02"),
    ).resolves.toEqual(["Reviewed novel"]);

    expect(supabaseMocks.assignPuzzle).toHaveBeenCalledWith(
      "get_or_create_daily_wikidata_novel_puzzle",
      { p_puzzle_date: "2026-11-02" },
    );

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[0].value;
    expect(titleQuery.eq).toHaveBeenCalledWith("media_type", "book");
    expect(titleQuery.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(titleQuery.eq).toHaveBeenCalledWith("format", "novel");
    expect(titleQuery.eq).toHaveBeenCalledWith("media_sources.provider", "wikidata");
    expect(titleQuery.neq).toHaveBeenCalledWith("id", "daily-answer-id");
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "rev%");
    expect(titleQuery.limit).toHaveBeenCalledWith(8);
  });

  it("escapes wildcard characters in the search prefix", async () => {
    await getWikidataBookTitleSuggestions("a%_", "2026-11-02");

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[0].value;
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "a\\%\\_%");
  });

  it("does not search when no daily book assignment is available", async () => {
    supabaseMocks.assignPuzzle.mockResolvedValue({ data: null, error: null });

    await expect(
      getWikidataBookTitleSuggestions("a", "2026-11-02"),
    ).rejects.toThrow("No approved book is scheduled for 2026-11-02 (UTC).");
    expect(supabaseMocks.titleLimit).not.toHaveBeenCalled();
  });
});
