import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  mapPuzzleRow: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: supabaseMocks.createClient,
}));

vi.mock("server-only", () => ({}));

vi.mock("./supabase-puzzle-mapper", () => ({
  mapSupabasePuzzleRow: supabaseMocks.mapPuzzleRow,
}));

import { getSupabasePuzzleForDate } from "./supabase-puzzle";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-secret");

  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    maybeSingle: supabaseMocks.maybeSingle,
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);

  supabaseMocks.rpc.mockReset().mockResolvedValue({ data: "media-id", error: null });
  supabaseMocks.maybeSingle.mockReset().mockResolvedValue({
    data: { puzzle_date: "2026-10-08", status: "scheduled" },
    error: null,
  });
  supabaseMocks.mapPuzzleRow.mockReset().mockReturnValue({ id: "media-id" });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    rpc: supabaseMocks.rpc,
    from: vi.fn().mockReturnValue(query),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabasePuzzleForDate", () => {
  it("assigns once per date before loading the persisted puzzle", async () => {
    const puzzle = await getSupabasePuzzleForDate("2026-10-08");

    expect(supabaseMocks.rpc).toHaveBeenCalledWith("get_or_create_daily_anime_puzzle", {
      p_puzzle_date: "2026-10-08",
    });
    expect(puzzle).toEqual({ id: "media-id" });
  });

  it("surfaces assignment failures instead of serving a fallback puzzle", async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "No approved playable anime is available." },
    });

    await expect(getSupabasePuzzleForDate("2026-10-08")).rejects.toThrow(
      "Supabase daily puzzle assignment failed: No approved playable anime is available.",
    );
  });

  it("rejects an invalid assignment response", async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: null });

    await expect(getSupabasePuzzleForDate("2026-10-08")).rejects.toThrow(
      "Supabase daily puzzle assignment returned an invalid media id.",
    );
  });
});
