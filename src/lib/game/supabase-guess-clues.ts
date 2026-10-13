import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Clue } from "./content";

type MediaType = "anime" | "movie";
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function relationNames(value: unknown, relationName: string): string[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const relation = item[relationName];
    const record = Array.isArray(relation) ? relation[0] : relation;
    if (!isRecord(record)) return [];
    const name = optionalString(record.name);
    return name ? [name] : [];
  });
}

function mapGuessClues(media: JsonRecord, mediaType: MediaType): Clue[] {
  const clues: Clue[] = [];
  const genres = [...new Set(relationNames(media.media_genres, "genres"))];
  if (genres.length) clues.push({ label: "Genre", value: genres.join(" · ") });

  if (typeof media.release_year === "number" && Number.isInteger(media.release_year)) {
    clues.push({ label: "Release year", value: String(media.release_year) });
  }

  if (mediaType === "movie") return clues;

  const format = optionalString(media.format);
  if (format) clues.push({ label: "Format", value: format });

  if (
    typeof media.episode_count === "number" &&
    Number.isInteger(media.episode_count) &&
    media.episode_count > 0
  ) {
    clues.push({ label: "Episodes", value: String(media.episode_count) });
  }

  const studios = [...new Set(relationNames(media.media_studios, "studios"))];
  if (studios.length) clues.push({ label: "Studio", value: studios.join(" · ") });

  const contentRating = optionalString(media.content_rating);
  if (contentRating) clues.push({ label: "Content rating", value: contentRating });

  return clues;
}

export async function getSupabaseGuessClues(
  title: string,
  answerId: string,
  mediaType: MediaType,
): Promise<Clue[] | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Guess comparisons require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const selection = [
    "id",
    "title",
    "release_year",
    ...(mediaType === "anime" ? ["episode_count", "format", "content_rating"] : []),
    "media_genres(genres(name))",
    ...(mediaType === "anime" ? ["media_studios(studios(name))"] : []),
    ...(mediaType === "movie"
      ? ["media_sources!inner(provider, tmdb_content_expires_at)"]
      : []),
  ].join(",");

  let query = supabase
    .from("media")
    .select(selection)
    .eq("media_type", mediaType)
    .eq("review_status", "approved")
    .neq("id", answerId)
    .ilike("title", title.replace(/[\\%_]/g, "\\$&"))
    .limit(2);

  if (mediaType === "movie") {
    query = query
      .eq("media_sources.provider", "tmdb")
      .gt("media_sources.tmdb_content_expires_at", new Date().toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Supabase guessed-title lookup failed: ${error.message}`);
  }
  if (!Array.isArray(data) || data.length !== 1 || !isRecord(data[0])) {
    return null;
  }

  return mapGuessClues(data[0], mediaType);
}
