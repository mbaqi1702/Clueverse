import { describe, expect, it } from "vitest";
import { mapTmdbMovie, parseTmdbImportOptions } from "./tmdb";

const sampleMovie = {
  id: 123,
  title: "A Sample Film",
  original_title: "サンプル映画",
  overview:
    "A cartographer returns to a coastal town and discovers that every map she draws reveals a memory someone has tried to hide.",
  release_date: "2024-06-15",
  genre_ids: [12, 9648, 12, -1, "28"],
  adult: false,
};
const genres = new Map([
  [12, "Adventure"],
  [9648, "Mystery"],
]);

describe("mapTmdbMovie", () => {
  it("maps a movie with provenance, aliases, and known genres", () => {
    expect(mapTmdbMovie(sampleMovie, genres)).toEqual({
      provider_id: "123",
      title: "A Sample Film",
      original_title: "サンプル映画",
      synopsis: sampleMovie.overview,
      release_year: 2024,
      episode_count: null,
      format: "movie",
      content_rating: null,
      aliases: ["A Sample Film", "サンプル映画"],
      genres: ["Adventure", "Mystery"],
      studios: [],
      source_url: "https://www.themoviedb.org/movie/123",
      attribution_text: expect.stringContaining("not endorsed, certified"),
    });
  });

  it("rejects invalid ids, adult records, and low-information movies", () => {
    expect(mapTmdbMovie({ ...sampleMovie, id: 0 }, genres)).toBeNull();
    expect(mapTmdbMovie({ ...sampleMovie, adult: true }, genres)).toBeNull();
    expect(mapTmdbMovie({ ...sampleMovie, title: "" }, genres)).toBeNull();
    expect(mapTmdbMovie({ ...sampleMovie, overview: "Too short." }, genres)).toBeNull();
  });

  it("keeps optional provider fields conservative", () => {
    const mapped = mapTmdbMovie(
      { ...sampleMovie, release_date: "2024-02-31", genre_ids: null, original_title: "" },
      genres,
    );
    expect(mapped).toMatchObject({
      original_title: null,
      release_year: null,
      genres: [],
    });
  });
});

describe("parseTmdbImportOptions", () => {
  it("defaults to one page and accepts a bounded range", () => {
    expect(parseTmdbImportOptions(undefined, undefined)).toEqual({ pages: 1, startPage: 1 });
    expect(parseTmdbImportOptions("3", "10")).toEqual({ pages: 3, startPage: 10 });
  });

  it("rejects invalid page counts and ranges", () => {
    for (const pages of ["0", "-1", "1.5", "11", "abc"]) {
      expect(() => parseTmdbImportOptions(pages, undefined)).toThrow(RangeError);
    }
    expect(() => parseTmdbImportOptions("2", "500")).toThrow(RangeError);
    expect(() => parseTmdbImportOptions(undefined, "501")).toThrow(RangeError);
  });
});
