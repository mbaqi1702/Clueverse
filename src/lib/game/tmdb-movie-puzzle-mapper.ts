import type { Clue, DailyPuzzle } from "./content";

export const TMDB_MOVIE_MAX_ATTEMPTS = 3;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneRelation(value: unknown, field: string): JsonRecord {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!isRecord(relation)) {
    throw new Error(`Scheduled movie is missing ${field}.`);
  }
  return relation;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function relationNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const relation = Array.isArray(item.genres) ? item.genres[0] : item.genres;
    if (!isRecord(relation)) return [];
    const name = optionalString(relation.name);
    return name ? [name] : [];
  });
}

export function hasUnexpiredTmdbContent(
  expiresAtValue: unknown,
  now = Date.now(),
): boolean {
  if (typeof expiresAtValue !== "string") return false;
  const expiresAt = Date.parse(expiresAtValue);
  return Number.isFinite(expiresAt) && now < expiresAt;
}

export function mapTmdbMoviePuzzleRow(value: unknown, now = Date.now()): DailyPuzzle | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error("Supabase returned an invalid movie puzzle row.");
  if (value.status !== "scheduled" && value.status !== "published") {
    throw new Error("Today's movie puzzle is not scheduled for play.");
  }

  const media = oneRelation(value.media, "approved movie media");
  if (media.review_status !== "approved" || media.media_type !== "movie") {
    throw new Error("Today's movie puzzle must use approved movie media.");
  }
  if (media.format !== "movie") {
    throw new Error("Today's movie puzzle must use movie-format media.");
  }

  const source = oneRelation(media.media_sources, "TMDB provenance");
  const sourceSnapshot = isRecord(source.source_snapshot) ? source.source_snapshot : null;
  if (
    source.provider !== "tmdb" ||
    sourceSnapshot?.adult !== false ||
    !hasUnexpiredTmdbContent(source.tmdb_content_expires_at, now)
  ) {
    throw new Error("Today's movie puzzle must have current, eligible TMDB provenance.");
  }

  const id = optionalString(media.id);
  const answer = optionalString(media.title);
  const synopsis = optionalString(media.synopsis);
  if (!id || !answer || !synopsis || synopsis.length < 80) {
    throw new Error("Today's approved movie is missing a playable title or synopsis.");
  }

  const genres = [...new Set(relationNames(media.media_genres))];
  const releaseYear = media.release_year;
  if (
    genres.length === 0 ||
    typeof releaseYear !== "number" ||
    !Number.isInteger(releaseYear) ||
    releaseYear < 1900 ||
    releaseYear > 2200
  ) {
    throw new Error("Today's approved movie needs a genre and valid release year.");
  }

  const clues: Clue[] = [
    { label: "Genre", value: genres.join(" · ") },
    { label: "Release year", value: String(releaseYear) },
  ];
  const aliases = (Array.isArray(media.media_aliases) ? media.media_aliases : [])
    .flatMap((item) => (isRecord(item) ? [optionalString(item.alias)] : []))
    .filter((alias): alias is string => Boolean(alias));

  return {
    id,
    answer,
    acceptedGuesses: [...new Set(aliases)],
    synopsis,
    clues,
    maxAttempts: TMDB_MOVIE_MAX_ATTEMPTS,
  };
}
