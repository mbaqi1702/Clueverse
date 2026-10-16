import type { Clue, DailyPuzzle } from "./content";

const WIKIDATA_BOOK_MAX_ATTEMPTS = 4;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneRelation(value: unknown, field: string): JsonRecord {
  const relation = Array.isArray(value) ? value[0] : value;
  if (!isRecord(relation)) {
    throw new Error(`Scheduled book is missing ${field}.`);
  }
  return relation;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function relatedNames(value: unknown, relationName: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const relation = oneOptionalRelation(item[relationName]);
    const name = relation ? text(relation.name) : null;
    return name ? [name] : [];
  });
}

function oneOptionalRelation(value: unknown): JsonRecord | null {
  const relation = Array.isArray(value) ? value[0] : value;
  return isRecord(relation) ? relation : null;
}

export function mapWikidataBookPuzzleRow(value: unknown): DailyPuzzle | null {
  if (value === null) return null;
  if (!isRecord(value)) throw new Error("Supabase returned an invalid book puzzle row.");
  if (value.status !== "scheduled" && value.status !== "published") {
    throw new Error("Today's book puzzle is not scheduled for play.");
  }

  const media = oneRelation(value.media, "approved book media");
  if (
    media.review_status !== "approved" ||
    media.media_type !== "book" ||
    media.format !== "novel"
  ) {
    throw new Error("Today's book puzzle must use approved novel media.");
  }

  const source = oneRelation(media.media_sources, "Wikidata provenance");
  if (source.provider !== "wikidata") {
    throw new Error("Today's book puzzle must have Wikidata provenance.");
  }

  const id = text(media.id);
  const answer = text(media.title);
  const synopsis = text(media.synopsis);
  const yearDetails = oneRelation(media.media_book_details, "publication year");
  const year = yearDetails.first_publication_year;
  const genres = [...new Set(relatedNames(media.media_genres, "genres"))];
  const authors = [...new Set(relatedNames(media.media_book_authors, "book_authors"))];

  if (!id || !answer || !synopsis || synopsis.length < 80) {
    throw new Error("Today's approved book is missing a playable title or original synopsis.");
  }
  if (
    genres.length === 0 ||
    authors.length === 0 ||
    typeof year !== "number" ||
    !Number.isInteger(year) ||
    year < 1 ||
    year > 2200
  ) {
    throw new Error("Today's approved novel needs a genre, author, and publication year.");
  }

  const aliases = (Array.isArray(media.media_aliases) ? media.media_aliases : [])
    .flatMap((item) => (isRecord(item) ? [text(item.alias)] : []))
    .filter((alias): alias is string => Boolean(alias));

  const clues: Clue[] = [
    { label: "Genre", value: genres.join(" · ") },
    { label: "Publication year", value: String(year) },
    { label: "Author", value: authors.join(" · ") },
  ];

  return {
    id,
    answer,
    acceptedGuesses: [...new Set(aliases)],
    synopsis,
    clues,
    maxAttempts: WIKIDATA_BOOK_MAX_ATTEMPTS,
  };
}
