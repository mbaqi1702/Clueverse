export type JikanImportRecord = {
  provider_id: string;
  title: string;
  original_title: string | null;
  synopsis: string;
  release_year: number | null;
  episode_count: number | null;
  format: string | null;
  content_rating: string | null;
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

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (isRecord(item) ? optionalText(item.name) : null))
    .filter((item): item is string => item !== null);
}

export function mapJikanAnime(value: unknown): JikanImportRecord | null {
  if (
    !isRecord(value) ||
    typeof value.mal_id !== "number" ||
    !Number.isSafeInteger(value.mal_id) ||
    value.mal_id < 1
  ) {
    return null;
  }

  const title = optionalText(value.title_english) ?? optionalText(value.title);
  const synopsis = optionalText(value.synopsis);
  if (!title || !synopsis || synopsis.length < 80) return null;

  const sourceId = String(value.mal_id);
  const aliases = [
    title,
    optionalText(value.title),
    optionalText(value.title_english),
    optionalText(value.title_japanese),
    ...(Array.isArray(value.title_synonyms)
      ? value.title_synonyms.filter((item): item is string => typeof item === "string")
      : []),
  ].filter((item): item is string => item !== null && item.trim().length > 0);

  const yearValue = value.year;
  const releaseYear =
    typeof yearValue === "number" &&
    Number.isInteger(yearValue) &&
    yearValue >= 1900 &&
    yearValue <= 2200
      ? yearValue
      : null;
  const episodeCount =
    typeof value.episodes === "number" &&
    Number.isInteger(value.episodes) &&
    value.episodes >= 0
      ? value.episodes
      : null;

  return {
    provider_id: sourceId,
    title,
    original_title: optionalText(value.title_japanese),
    synopsis,
    release_year: releaseYear,
    episode_count: episodeCount,
    format: optionalText(value.type),
    content_rating: optionalText(value.rating),
    aliases: [...new Set(aliases)],
    genres: textList(value.genres),
    studios: textList(value.studios),
    source_url: `https://myanimelist.net/anime/${sourceId}`,
    attribution_text:
      "Metadata retrieved through Jikan REST API v4; source record is MyAnimeList. Attribution and reuse terms require review before publication.",
  };
}

export function parseImportPages(value: string | undefined): number {
  if (value === undefined) return 1;
  const pages = Number(value);
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) {
    throw new RangeError("JIKAN_IMPORT_PAGES must be an integer from 1 to 100.");
  }
  return pages;
}
