import { describe, expect, it } from "vitest";
import {
  hasUnexpiredTmdbContent,
  mapTmdbMoviePuzzleRow,
} from "./tmdb-movie-puzzle-mapper";

const now = Date.UTC(2026, 9, 12);
const row = {
  status: "scheduled",
  media: {
    id: "movie-id",
    title: "Reviewed movie",
    synopsis: "A sufficiently detailed synopsis for a reviewed movie puzzle, longer than eighty characters.",
    media_type: "movie",
    review_status: "approved",
    format: "movie",
    release_year: 2024,
    media_aliases: [{ alias: "Alternate movie title" }],
    media_genres: [{ genres: { name: "Mystery" } }, { genres: { name: "Drama" } }],
    media_sources: [{
      provider: "tmdb",
      source_snapshot: { adult: false },
      tmdb_content_expires_at: "2026-10-13T00:00:00.000Z",
    }],
  },
};

describe("hasUnexpiredTmdbContent", () => {
  it("accepts content before its six-month expiry and rejects expired or invalid timestamps", () => {
    expect(hasUnexpiredTmdbContent("2026-10-13T00:00:00.000Z", now)).toBe(true);
    expect(hasUnexpiredTmdbContent("2026-10-12T00:00:00.000Z", now)).toBe(false);
    expect(hasUnexpiredTmdbContent("not-a-date", now)).toBe(false);
    expect(hasUnexpiredTmdbContent(null, now)).toBe(false);
  });
});

describe("mapTmdbMoviePuzzleRow", () => {
  it("maps only the movie clue set and retains the answer privately", () => {
    expect(mapTmdbMoviePuzzleRow(row, now)).toEqual({
      id: "movie-id",
      answer: "Reviewed movie",
      acceptedGuesses: ["Alternate movie title"],
      synopsis: row.media.synopsis,
      clues: [
        { label: "Genre", value: "Mystery · Drama" },
        { label: "Release year", value: "2024" },
      ],
      maxAttempts: 3,
    });
  });

  it("returns null when no movie is assigned", () => {
    expect(mapTmdbMoviePuzzleRow(null, now)).toBeNull();
  });

  it.each([
    { ...row, status: "draft" },
    { ...row, media: { ...row.media, media_type: "anime" } },
    { ...row, media: { ...row.media, review_status: "pending_review" } },
    { ...row, media: { ...row.media, format: "tv" } },
    { ...row, media: { ...row.media, media_sources: [{ provider: "other", tmdb_content_expires_at: "2026-10-13T00:00:00Z" }] } },
    { ...row, media: { ...row.media, media_sources: [{ provider: "tmdb", source_snapshot: { adult: false }, tmdb_content_expires_at: "2026-10-12T00:00:00Z" }] } },
    { ...row, media: { ...row.media, media_sources: [{ provider: "tmdb", source_snapshot: { adult: true }, tmdb_content_expires_at: "2026-10-13T00:00:00Z" }] } },
    { ...row, media: { ...row.media, media_sources: [{ provider: "tmdb", tmdb_content_expires_at: "2026-10-13T00:00:00Z" }] } },
    { ...row, media: { ...row.media, media_genres: [] } },
    { ...row, media: { ...row.media, release_year: null } },
  ])("rejects records that are unreviewed, wrong-type, stale, or missing movie clues", (invalidRow) => {
    expect(() => mapTmdbMoviePuzzleRow(invalidRow, now)).toThrow();
  });
});
