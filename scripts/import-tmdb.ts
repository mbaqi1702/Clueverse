import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  mapTmdbMovie,
  parseTmdbImportOptions,
  type TmdbImportRecord,
} from "./lib/tmdb";

dotenv.config({ path: ".env.local" });

const API_ROOT = "https://api.themoviedb.org/3";
const REQUEST_DELAY_MS = 1_000;
const MAX_RETRIES = 5;

type TmdbPage = {
  results: unknown[];
  total_pages: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseArgs(args: string[]) {
  let apply = false;
  let pagesValue: string | undefined;
  let startPageValue: string | undefined;

  for (const arg of args) {
    if (arg === "--apply") {
      apply = true;
    } else if (arg.startsWith("--pages=")) {
      pagesValue = arg.slice("--pages=".length);
    } else if (arg.startsWith("--start-page=")) {
      startPageValue = arg.slice("--start-page=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { apply, ...parseTmdbImportOptions(pagesValue, startPageValue) };
}

async function fetchTmdbJson(path: string, apiKey: string): Promise<unknown> {
  const url = new URL(`${API_ROOT}${path}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(20_000),
      });
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        const detail = error instanceof Error ? ` ${error.message}` : "";
        throw new Error(`TMDB network request failed after ${MAX_RETRIES} attempts.${detail}`, {
          cause: error,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** attempt * 2_000, 30_000)));
      continue;
    }

    if (response.ok) return response.json();
    if (response.status !== 429 && response.status < 500) {
      throw new Error(`TMDB request failed with HTTP ${response.status}.`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs =
      response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1_000
        : Math.min(2 ** attempt * 2_000, 30_000);
    if (attempt === MAX_RETRIES - 1) {
      throw new Error(`TMDB request still failing after ${MAX_RETRIES} attempts (HTTP ${response.status}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw new Error("TMDB request exhausted retries unexpectedly.");
}

function parseGenreNames(value: unknown): Map<number, string> {
  if (!isRecord(value) || !Array.isArray(value.genres)) {
    throw new Error("TMDB returned an unexpected genre response shape.");
  }

  const genreNames = new Map<number, string>();
  for (const genre of value.genres) {
    if (
      isRecord(genre) &&
      typeof genre.id === "number" &&
      Number.isSafeInteger(genre.id) &&
      genre.id > 0 &&
      typeof genre.name === "string" &&
      genre.name.trim()
    ) {
      genreNames.set(genre.id, genre.name.trim());
    }
  }
  return genreNames;
}

function parseMoviePage(value: unknown, expectedPage: number): TmdbPage {
  if (
    !isRecord(value) ||
    value.page !== expectedPage ||
    !Array.isArray(value.results) ||
    typeof value.total_pages !== "number" ||
    !Number.isInteger(value.total_pages) ||
    value.total_pages < 0
  ) {
    throw new Error("TMDB returned an unexpected movie page response shape.");
  }
  return { results: value.results, total_pages: value.total_pages };
}

async function main() {
  const { apply, pages, startPage } = parseArgs(process.argv.slice(2));
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error("TMDB_API_KEY must be set in .env.local.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (apply && (!supabaseUrl || !supabaseSecret)) {
    throw new Error(
      "Apply mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  const supabase =
    apply && supabaseUrl && supabaseSecret
      ? createClient(supabaseUrl, supabaseSecret, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

  const genreNames = parseGenreNames(await fetchTmdbJson("/genre/movie/list", apiKey));
  let fetched = 0;
  let mapped = 0;
  let skipped = 0;
  let written = 0;
  let totalPages = 500;
  const preview: TmdbImportRecord[] = [];

  for (let page = startPage; page < startPage + pages && page <= totalPages; page += 1) {
    if (page > startPage) await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    const result = parseMoviePage(
      await fetchTmdbJson(`/movie/top_rated?page=${page}`, apiKey),
      page,
    );
    totalPages = Math.min(result.total_pages, 500);
    fetched += result.results.length;

    const records: TmdbImportRecord[] = [];
    for (const item of result.results) {
      const record = mapTmdbMovie(item, genreNames);
      if (!record) {
        skipped += 1;
        continue;
      }
      mapped += 1;
      records.push(record);
      if (!apply && preview.length < 5) preview.push(record);
    }

    if (supabase && records.length > 0) {
      const { error } = await supabase.rpc("upsert_tmdb_movie_batch", { p_items: records });
      if (error) throw new Error(`Failed to import TMDB page ${page}: ${error.message}`);
      written += records.length;
    }
  }

  console.info(
    `${apply ? "Import complete" : "Dry run complete"}: ${fetched} fetched, ${mapped} usable, ${skipped} rejected, ${written} written.`,
  );
  if (!apply) {
    console.info(`Review preview (first ${preview.length} usable records):`);
    console.info(JSON.stringify(preview, null, 2));
    console.info(
      "No database writes performed. Apply the TMDB migration and use --apply only after reviewing the preview.",
    );
  }
}

main().catch((error: unknown) => {
  console.error("TMDB import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
