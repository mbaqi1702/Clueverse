export type TmdbImportRecord = {
  provider_id: string;
  title: string;
  original_title: string | null;
  synopsis: string;
  release_year: number | null;
  episode_count: null;
  format: "movie";
  content_rating: null;
  aliases: string[];
  genres: string[];
  studios: string[];
  source_url: string;
  attribution_text: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function mapTmdbMovie(
  value: unknown,
  genreNames: ReadonlyMap<number, string>,
): TmdbImportRecord | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    value.id < 1 ||
    value.adult === true
  ) {
    return null;
  }

  const title = optionalText(value.title);
  const synopsis = optionalText(value.overview);
  if (!title || !synopsis || synopsis.length < 80) return null;

  const originalTitle = optionalText(value.original_title);
  const releaseDate = optionalText(value.release_date);
  const releaseDateParts = releaseDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const candidateYear = releaseDateParts ? Number(releaseDateParts[1]) : null;
  const releaseDateValue =
    releaseDateParts && candidateYear !== null
      ? new Date(
          Date.UTC(candidateYear, Number(releaseDateParts[2]) - 1, Number(releaseDateParts[3])),
        )
      : null;
  const releaseDateIsValid =
    releaseDateParts != null &&
    releaseDateValue !== null &&
    releaseDateValue.getUTCFullYear() === candidateYear &&
    releaseDateValue.getUTCMonth() === Number(releaseDateParts[2]) - 1 &&
    releaseDateValue.getUTCDate() === Number(releaseDateParts[3]);
  const releaseYear = releaseDateIsValid ? candidateYear : null;
  const validReleaseYear =
    releaseYear !== null && releaseYear >= 1900 && releaseYear <= 2200
      ? releaseYear
      : null;
  const genreIds = Array.isArray(value.genre_ids)
    ? value.genre_ids.filter(
        (id): id is number =>
          typeof id === "number" && Number.isSafeInteger(id) && id > 0,
      )
    : [];
  const genres = [
    ...new Set(
      genreIds
        .map((id) => genreNames.get(id)?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const providerId = String(value.id);

  return {
    provider_id: providerId,
    title,
    original_title: originalTitle,
    synopsis,
    release_year: validReleaseYear,
    episode_count: null,
    format: "movie",
    content_rating: null,
    aliases: [...new Set([title, originalTitle].filter((alias): alias is string => alias !== null))],
    genres,
    studios: [],
    source_url: `https://www.themoviedb.org/movie/${providerId}`,
    attribution_text: "Data from TMDB. This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB.",
  };
}

export function parseTmdbImportOptions(
  pagesValue: string | undefined,
  startPageValue: string | undefined,
): { pages: number; startPage: number } {
  const pages = pagesValue === undefined ? 1 : Number(pagesValue);
  const startPage = startPageValue === undefined ? 1 : Number(startPageValue);

  if (!Number.isInteger(pages) || pages < 1 || pages > 10) {
    throw new RangeError("TMDB_IMPORT_PAGES must be an integer from 1 to 10.");
  }
  if (!Number.isInteger(startPage) || startPage < 1 || startPage > 500) {
    throw new RangeError("TMDB_IMPORT_START_PAGE must be an integer from 1 to 500.");
  }
  if (startPage + pages > 501) {
    throw new RangeError("The requested TMDB page range must end at page 500 or earlier.");
  }

  return { pages, startPage };
}
