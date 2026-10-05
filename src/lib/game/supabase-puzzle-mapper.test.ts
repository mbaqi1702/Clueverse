import { describe, expect, it } from "vitest";
import { mapSupabasePuzzleRow } from "./supabase-puzzle-mapper";

const validPuzzleRow = {
  status: "published",
  media: {
    id: "media-id",
    title: "Reviewed title",
    synopsis: "A reviewed synopsis.",
    media_type: "anime",
    review_status: "approved",
    release_year: 2020,
    format: "TV",
    episode_count: 12,
    content_rating: "PG-13",
    media_aliases: [{ alias: "Alternate title" }],
    media_genres: [{ genres: { name: "Mystery" } }],
    media_studios: [{ studios: { name: "Studio Example" } }],
  },
};

describe("mapSupabasePuzzleRow", () => {
  it("maps an approved scheduled record to a private game puzzle", () => {
    expect(mapSupabasePuzzleRow(validPuzzleRow)).toEqual({
      id: "media-id",
      answer: "Reviewed title",
      acceptedGuesses: ["Alternate title"],
      synopsis: "A reviewed synopsis.",
      clues: [
        { label: "Genre", value: "Mystery" },
        { label: "Release year", value: "2020" },
        { label: "Format", value: "TV" },
        { label: "Episodes", value: "12" },
      ],
      maxAttempts: 5,
    });
  });

  it("returns null when there is no scheduled puzzle", () => {
    expect(mapSupabasePuzzleRow(null)).toBeNull();
  });

  it.each([
    { ...validPuzzleRow, status: "draft" },
    { ...validPuzzleRow, media: { ...validPuzzleRow.media, review_status: "pending_review" } },
    { ...validPuzzleRow, media: { ...validPuzzleRow.media, media_type: "movie" } },
    {
      ...validPuzzleRow,
      media: { ...validPuzzleRow.media, media_genres: [], format: null, release_year: null },
    },
  ])("rejects records that are not safe, reviewed, and playable", (row) => {
    expect(() => mapSupabasePuzzleRow(row)).toThrow();
  });
});
