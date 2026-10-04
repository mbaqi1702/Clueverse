import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { mapJikanAnime, parseImportPages, type JikanImportRecord } from "./lib/jikan";

dotenv.config({ path: ".env.local" });

const API_ROOT = "https://api.jikan.moe/v4";
const REQUEST_DELAY_MS = 1_300;
const MAX_RETRIES = 5;

type JikanPage = {
  data: unknown[];
  pagination: { has_next_page: boolean };
};

function parseArgs(args: string[]) {
  let apply = false;
  let pagesValue: string | undefined;
  for (const arg of args) {
    if (arg === "--apply") {
      apply = true;
    } else if (arg.startsWith("--pages=")) {
      pagesValue = arg.slice("--pages=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { apply, pages: parseImportPages(pagesValue) };
}

async function fetchJikanPage(page: number): Promise<JikanPage> {
  const url = new URL(`${API_ROOT}/top/anime`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "25");

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: "application/json" } });
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) {
        throw new Error(`Jikan network request failed after ${MAX_RETRIES} attempts.`, {
          cause: error,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(2 ** attempt * 2_000, 30_000)));
      continue;
    }

    if (response.ok) {
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("data" in payload) ||
        !Array.isArray(payload.data) ||
        !("pagination" in payload) ||
        typeof payload.pagination !== "object" ||
        payload.pagination === null ||
        !("has_next_page" in payload.pagination) ||
        typeof payload.pagination.has_next_page !== "boolean"
      ) {
        throw new Error("Jikan returned an unexpected response shape.");
      }
      return {
        data: payload.data,
        pagination: { has_next_page: payload.pagination.has_next_page },
      };
    }

    if (response.status !== 429 && response.status < 500) {
      throw new Error(`Jikan request failed with HTTP ${response.status}.`);
    }

    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs =
      response.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1_000
        : Math.min(2 ** attempt * 2_000, 30_000);
    if (attempt === MAX_RETRIES - 1) {
      throw new Error(`Jikan request still failing after ${MAX_RETRIES} attempts (HTTP ${response.status}).`);
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  throw new Error("Jikan request exhausted retries unexpectedly.");
}

async function main() {
  const { apply, pages } = parseArgs(process.argv.slice(2));
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

  let fetched = 0;
  let mapped = 0;
  let skipped = 0;
  let written = 0;
  let hasNextPage = true;

  for (let page = 1; page <= pages && hasNextPage; page += 1) {
    if (page > 1) await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    const result = await fetchJikanPage(page);
    hasNextPage = result.pagination.has_next_page;
    fetched += result.data.length;

    const records: JikanImportRecord[] = [];
    for (const item of result.data) {
      const record = mapJikanAnime(item);
      if (!record) {
        skipped += 1;
        continue;
      }
      mapped += 1;
      records.push(record);
    }
    if (supabase && records.length > 0) {
      const { error } = await supabase.rpc("upsert_jikan_anime_batch", { p_items: records });
      if (error) {
        throw new Error(`Failed to import Jikan page ${page}: ${error.message}`);
      }
      written += records.length;
    }
  }

  console.info(
    `${apply ? "Import complete" : "Dry run complete"}: ${fetched} fetched, ${mapped} usable, ${skipped} rejected, ${written} written.`,
  );
  if (!apply) {
    console.info("No database writes performed. Add --apply only after applying the migration and reviewing provider terms.");
  }
}

main().catch((error: unknown) => {
  console.error("Jikan import failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
