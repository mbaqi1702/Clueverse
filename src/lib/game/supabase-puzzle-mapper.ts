import type { Clue, DailyPuzzle } from "./content";

const MAX_ATTEMPTS = 5;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneRelation(value: unknown, field: string): JsonRecord {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!isRecord(relation)) {
    throw new Error(`Scheduled puzzle is missing ${field}.`);
  }
  return relation;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function relationNames(value: unknown, relationName: string): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const relation = item[relationName];
    const relatedRecord = Array.isArray(relation) ? relation[0] : relation;
    if (!isRecord(relatedRecord)) return [];
    const name = optionalString(relatedRecord.name);
    return name ? [name] : [];
  });
}

export function mapSupabasePuzzleRow(value: unknown): DailyPuzzle | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error("Supabase returned an invalid daily puzzle row.");

  const row = value;
  if (row.status !== "scheduled" && row.status !== "published") {
    throw new Error("Today's puzzle is not scheduled for play.");
  }

  const media = oneRelation(row.media, "approved anime media");
  if (media.review_status !== "approved" || media.media_type !== "anime") {
    throw new Error("Today's puzzle must use approved anime media.");
  }

  const id = optionalString(media.id);
  const answer = optionalString(media.title);
  const synopsis = optionalString(media.synopsis);
  if (!id || !answer || !synopsis) {
    throw new Error("Today's approved media is missing its title or synopsis.");
  }

  const clues: Clue[] = [];
  const genres = relationNames(media.media_genres, "genres");
  const studios = relationNames(media.media_studios, "studios");
  const releaseYear = media.release_year;
  const episodeCount = media.episode_count;

  if (genres.length) clues.push({ label: "Genre", value: [...new Set(genres)].join(" · ") });
  if (typeof releaseYear === "number" && Number.isInteger(releaseYear)) {
    clues.push({ label: "Release year", value: String(releaseYear) });
  }
  const format = optionalString(media.format);
  if (format) clues.push({ label: "Format", value: format });
  if (typeof episodeCount === "number" && Number.isInteger(episodeCount) && episodeCount > 0) {
    clues.push({ label: "Episodes", value: String(episodeCount) });
  }
  if (studios.length) clues.push({ label: "Studio", value: [...new Set(studios)].join(" · ") });
  const contentRating = optionalString(media.content_rating);
  if (contentRating) clues.push({ label: "Content rating", value: contentRating });

  const playableClues = clues.slice(0, MAX_ATTEMPTS - 1);
  if (playableClues.length < MAX_ATTEMPTS - 1) {
    throw new Error("Today's approved media needs four reviewed clue attributes before scheduling.");
  }

  const aliases = (Array.isArray(media.media_aliases) ? media.media_aliases : [])
    .flatMap((item) => (isRecord(item) ? [optionalString(item.alias)] : []))
    .filter((alias): alias is string => Boolean(alias));

  return {
    id,
    answer,
    acceptedGuesses: [...new Set(aliases)],
    synopsis,
    clues: playableClues,
    maxAttempts: MAX_ATTEMPTS,
  };
}
