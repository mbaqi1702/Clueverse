export type WikidataBookImportRecord = {
  provider_id: string;
  title: string;
  original_title: null;
  synopsis: null;
  release_year: null;
  episode_count: null;
  format: "novel";
  content_rating: null;
  aliases: string[];
  authors: { provider_id: string; name: string }[];
  publication_year: number;
  genres: string[];
  source_url: string;
  attribution_text: string;
};

const NOVEL_ITEM_ID = "Q7725634";
const ENGLISH_LANGUAGE_ITEM_ID = "Q1860";
const MAX_SEARCH_RESULTS = 20;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function entityIds(value: unknown, property: string): string[] {
  if (!isRecord(value) || !isRecord(value.claims)) return [];
  const claims = value.claims[property];
  if (!Array.isArray(claims)) return [];

  return claims.flatMap((claim) => {
    if (!isRecord(claim) || !isRecord(claim.mainsnak)) return [];
    const { datavalue } = claim.mainsnak;
    if (!isRecord(datavalue) || !isRecord(datavalue.value)) return [];
    const id = datavalue.value.id;
    return typeof id === "string" && /^Q[1-9]\d*$/.test(id) ? [id] : [];
  });
}

function englishLabel(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.labels) || !isRecord(value.labels.en)) {
    return null;
  }
  const label = value.labels.en.value;
  return typeof label === "string" && label.trim() ? label.trim() : null;
}

function publicationYear(value: unknown): number | null {
  if (!isRecord(value) || !isRecord(value.claims) || !Array.isArray(value.claims.P577)) {
    return null;
  }

  const years = value.claims.P577.flatMap((claim) => {
    if (!isRecord(claim) || !isRecord(claim.mainsnak)) return [];
    const datavalue = claim.mainsnak.datavalue;
    if (!isRecord(datavalue) || !isRecord(datavalue.value)) return [];
    const date = datavalue.value.time;
    const precision = datavalue.value.precision;
    if (typeof date !== "string" || typeof precision !== "number" || precision < 9) {
      return [];
    }
    const match = date.match(/^\+?(\d{1,4})-/);
    if (!match) return [];
    const year = Number(match[1]);
    return Number.isInteger(year) && year >= 1 && year <= 2200 ? [year] : [];
  });

  return years.length ? Math.min(...years) : null;
}

export function parseWikidataSearchIds(value: unknown, limit: number): string[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS) {
    throw new RangeError("Wikidata search limit must be an integer from 1 to 20.");
  }
  if (!isRecord(value) || !Array.isArray(value.search)) {
    throw new Error("Wikidata returned an unexpected search response.");
  }

  return [
    ...new Set(
      value.search.flatMap((result) => {
        if (!isRecord(result) || typeof result.id !== "string") return [];
        return /^Q[1-9]\d*$/.test(result.id) ? [result.id] : [];
      }),
    ),
  ].slice(0, limit);
}

export function parseWikidataSparqlIds(value: unknown, limit: number): string[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS * 10) {
    throw new RangeError("Wikidata bulk limit must be an integer from 1 to 200.");
  }
  if (!isRecord(value) || !isRecord(value.results) || !Array.isArray(value.results.bindings)) {
    throw new Error("Wikidata returned an unexpected SPARQL response.");
  }

  return [
    ...new Set(
      value.results.bindings.flatMap((binding) => {
        if (!isRecord(binding) || !isRecord(binding.work)) return [];
        const uri = binding.work.value;
        if (typeof uri !== "string") return [];
        const match = uri.match(/^https?:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/);
        return match ? [match[1]] : [];
      }),
    ),
  ].slice(0, limit);
}

export function parseWikidataEntities(value: unknown): unknown[] {
  if (!isRecord(value) || !isRecord(value.entities)) {
    throw new Error("Wikidata returned an unexpected entity response.");
  }
  return Object.values(value.entities);
}

export function parseWikidataLabels(value: unknown): Map<string, string> {
  if (!isRecord(value) || !isRecord(value.entities)) {
    throw new Error("Wikidata returned an unexpected linked-entity response.");
  }

  const labels = new Map<string, string>();
  for (const [id, entity] of Object.entries(value.entities)) {
    const label = englishLabel(entity);
    if (label) labels.set(id, label);
  }
  return labels;
}

export function getLinkedWikidataIds(entities: readonly unknown[]): string[] {
  const ids = entities.flatMap((entity) => [
    ...entityIds(entity, "P50"),
    ...entityIds(entity, "P136"),
  ]);
  return [...new Set(ids)];
}

export function mapWikidataNovel(
  value: unknown,
  linkedLabels: ReadonlyMap<string, string>,
): WikidataBookImportRecord | null {
  if (!isRecord(value) || typeof value.id !== "string" || !/^Q[1-9]\d*$/.test(value.id)) {
    return null;
  }

  const title = englishLabel(value);
  const types = entityIds(value, "P31");
  const languages = entityIds(value, "P407");
  const authorIds = [...new Set(entityIds(value, "P50"))];
  const genreIds = [...new Set(entityIds(value, "P136"))];
  const authors = authorIds.flatMap((id) => {
    const label = linkedLabels.get(id);
    return label ? [{ provider_id: id, name: label }] : [];
  });
  const genres = genreIds.flatMap((id) => {
    const label = linkedLabels.get(id);
    return label ? [label] : [];
  });
  const year = publicationYear(value);

  if (
    !title ||
    !types.includes(NOVEL_ITEM_ID) ||
    !languages.includes(ENGLISH_LANGUAGE_ITEM_ID) ||
    authors.length !== authorIds.length ||
    genres.length !== genreIds.length ||
    authors.length === 0 ||
    genres.length === 0 ||
    year === null
  ) {
    return null;
  }

  const aliases = isRecord(value.aliases) && Array.isArray(value.aliases.en)
    ? value.aliases.en.flatMap((alias) =>
        isRecord(alias) && typeof alias.value === "string" && alias.value.trim()
          ? [alias.value.trim()]
          : [],
      )
    : [];

  return {
    provider_id: value.id,
    title,
    original_title: null,
    synopsis: null,
    release_year: null,
    episode_count: null,
    format: "novel",
    content_rating: null,
    aliases: [...new Set([title, ...aliases])],
    authors,
    publication_year: year,
    genres: [...new Set(genres)],
    source_url: `https://www.wikidata.org/wiki/${value.id}`,
    attribution_text: "Structured metadata from Wikidata, released under CC0.",
  };
}

export function parseWikidataImportOptions(
  queryValue: string | undefined,
  limitValue: string | undefined,
): { query: string; limit: number } {
  const query = queryValue?.trim() ?? "";
  const limit = limitValue === undefined ? 10 : Number(limitValue);

  if (query.length < 2 || query.length > 100) {
    throw new RangeError("WIKIDATA_BOOK_QUERY must contain 2 to 100 characters.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS) {
    throw new RangeError("WIKIDATA_BOOK_LIMIT must be an integer from 1 to 20.");
  }

  return { query, limit };
}
