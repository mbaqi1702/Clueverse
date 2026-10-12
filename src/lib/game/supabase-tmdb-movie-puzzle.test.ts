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
vi.mock("./tmdb-movie-puzzle-mapper", () => ({
  mapTmdbMoviePuzzleRow: supabaseMocks.mapPuzzleRow,
}));

import { getSupabaseTmdbMoviePuzzleForDate } from "./supabase-tmdb-movie-puzzle";

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

  supabaseMocks.rpc.mockReset().mockResolvedValue({ data: "movie-id", error: null });
  supabaseMocks.maybeSingle.mockReset().mockResolvedValue({ data: { status: "scheduled" }, error: null });
  supabaseMocks.mapPuzzleRow.mockReset().mockReturnValue({ id: "movie-id" });
  supabaseMocks.createClient.mockReset().mockReturnValue({
    rpc: supabaseMocks.rpc,
    from: vi.fn().mockReturnValue(query),
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseTmdbMoviePuzzleForDate", () => {
  it("uses the separate TMDB assignment and movie schedule", async () => {
    await expect(getSupabaseTmdbMoviePuzzleForDate("2026-10-12")).resolves.toEqual({ id: "movie-id" });
    expect(supabaseMocks.rpc).toHaveBeenCalledWith("get_or_create_daily_tmdb_movie_puzzle", {
      p_puzzle_date: "2026-10-12",
    });
  });

  it("surfaces assignment and lookup failures without fallback", async () => {
    supabaseMocks.rpc.mockResolvedValue({ data: null, error: { message: "No approved movie." } });
    await expect(getSupabaseTmdbMoviePuzzleForDate("2026-10-12")).rejects.toThrow(
      "Supabase daily movie puzzle assignment failed: No approved movie.",
    );

    supabaseMocks.rpc.mockResolvedValue({ data: "movie-id", error: null });
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: { message: "lookup failed" } });
    await expect(getSupabaseTmdbMoviePuzzleForDate("2026-10-12")).rejects.toThrow(
      "Supabase daily movie puzzle lookup failed: lookup failed",
    );
  });
});
