import { describe, expect, it } from "vitest";
import { mapTenraiAnime, parseImportPages } from "./tenrai";

const sampleAnime = {
  mal_id: 123,
  title: "Sample Story",
  title_english: "A Sample Story",
  title_japanese: "サンプルストーリー",
  title_synonyms: ["Sample Tale"],
  synopsis:
    "A young archivist discovers a hidden observatory and follows a series of maps that reveal forgotten memories across a quiet coastal town.",
  type: "TV",
  year: 2024,
  episodes: 12,
  rating: "PG-13",
  genres: [{ name: "Adventure" }, { name: "Mystery" }],
  studios: [{ name: "Example Studio" }],
};

describe("mapTenraiAnime", () => {
  it("maps provider data and retains provenance and aliases", () => {
    expect(mapTenraiAnime(sampleAnime)).toEqual({
      provider_id: "123",
      title: "A Sample Story",
      original_title: "サンプルストーリー",
      synopsis: sampleAnime.synopsis,
      release_year: 2024,
      episode_count: 12,
      format: "TV",
      content_rating: "PG-13",
      aliases: ["A Sample Story", "Sample Story", "サンプルストーリー", "Sample Tale"],
      genres: ["Adventure", "Mystery"],
      studios: ["Example Studio"],
      source_url: "https://myanimelist.net/anime/123",
      attribution_text: expect.stringContaining("Tenrai API v1"),
    });
  });

  it("rejects missing ids, titles, synopses, and low-information synopses", () => {
    expect(mapTenraiAnime({ ...sampleAnime, mal_id: 0 })).toBeNull();
    expect(mapTenraiAnime({ ...sampleAnime, title: "", title_english: null })).toBeNull();
    expect(mapTenraiAnime({ ...sampleAnime, synopsis: "Too short." })).toBeNull();
    expect(mapTenraiAnime({ ...sampleAnime, synopsis: null })).toBeNull();
  });

  it("does not trust invalid optional values", () => {
    const mapped = mapTenraiAnime({
      ...sampleAnime,
      year: "not a year",
      episodes: -1,
      genres: null,
      studios: "unknown",
    });
    expect(mapped).toMatchObject({
      release_year: null,
      episode_count: null,
      genres: [],
      studios: [],
    });
  });
});

describe("parseImportPages", () => {
  it("defaults to a one-page test batch", () => {
    expect(parseImportPages(undefined)).toBe(1);
  });

  it("rejects unsafe or invalid page counts", () => {
    for (const value of ["0", "-1", "1.5", "101", "abc"]) {
      expect(() => parseImportPages(value)).toThrow(RangeError);
    }
  });
});
