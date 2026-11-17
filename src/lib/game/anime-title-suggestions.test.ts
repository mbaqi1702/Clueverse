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

import { getAnimeTitleSuggestions } from "./anime-title-suggestions";

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
    ilike: vi.fn(),
    order: vi.fn(),
    limit: supabaseMocks.titleLimit,
  };
  titleQuery.select.mockReturnValue(titleQuery);
  titleQuery.eq.mockReturnValue(titleQuery);
  titleQuery.neq.mockReturnValue(titleQuery);
  titleQuery.ilike.mockReturnValue(titleQuery);
  titleQuery.order.mockReturnValue(titleQuery);

  supabaseMocks.assignmentMaybeSingle.mockReset().mockResolvedValue({
    data: { media_id: "daily-answer-id" },
    error: null,
  });
  supabaseMocks.titleLimit.mockReset().mockResolvedValue({
    data: [
      { id: "daily-answer-id", title: "Attack on Titan" },
      { id: "other-id", title: "My Attack on Titan" },
    ],
    error: null,
  });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    from: vi.fn((table: string) =>
      table === "daily_puzzles" ? assignmentQuery : titleQuery,
    ),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAnimeTitleSuggestions", () => {
  it("searches approved anime titles while excluding the active answer", async () => {
    await expect(getAnimeTitleSuggestions("att", "2026-10-11")).resolves.toEqual([
      "My Attack on Titan",
    ]);

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[1].value;
    expect(titleQuery.eq).toHaveBeenCalledWith("media_type", "anime");
    expect(titleQuery.eq).toHaveBeenCalledWith("review_status", "approved");
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "%att%");
    expect(titleQuery.limit).toHaveBeenCalledWith(64);
  });

  it("escapes wildcard characters in the search prefix", async () => {
    await getAnimeTitleSuggestions("a%_", "2026-10-11");

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[1].value;
    expect(titleQuery.ilike).toHaveBeenCalledWith("title", "%a\\%\\_%");
  });

  it("searches original titles and aliases", async () => {
    supabaseMocks.titleLimit.mockResolvedValue({
      data: [
        {
          id: "anime-id",
          title: "Cowboy Bebop",
          original_title: "カウボーイビバップ",
          media_aliases: [{ alias: "カウボーイビバップ" }],
        },
      ],
      error: null,
    });

    await expect(getAnimeTitleSuggestions("カウボーイ", "2026-10-11")).resolves.toEqual([
      "Cowboy Bebop",
    ]);

    const client = supabaseMocks.createClient.mock.results[0].value;
    const titleQuery = client.from.mock.results[1].value;
    expect(titleQuery.ilike).toHaveBeenCalledWith("original_title", "%カウボーイ%");
    expect(titleQuery.ilike).toHaveBeenCalledWith("media_aliases.alias", "%カウボーイ%");
  });

  it("surfaces a missing daily assignment instead of searching the answer catalog", async () => {
    supabaseMocks.assignmentMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(getAnimeTitleSuggestions("a", "2026-10-11")).rejects.toThrow(
      "No approved puzzle is scheduled for 2026-10-11 (UTC).",
    );
    expect(supabaseMocks.titleLimit).toHaveBeenCalledTimes(3);
  });
});
