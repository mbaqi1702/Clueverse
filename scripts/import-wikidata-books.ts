import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  getLinkedWikidataIds,
  mapWikidataNovel,
  parseWikidataEntities,
  parseWikidataImportOptions,
  parseWikidataLabels,
  parseWikidataSearchIds,
  type WikidataBookImportRecord,
} from "./lib/wikidata-books";

dotenv.config({ path: ".env.local" });

const API_ROOT = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "ClueVerse/0.1 (+https://github.com/mbaqi1702/Clueverse)";
const REQUEST_DELAY_MS = 1_000;
const ENTITY_BATCH_SIZE = 50;

function parseArgs(args: string[]) {
  let apply = false;
  let queryValue: string | undefined;
  let limitValue: string | undefined;

  for (const arg of args) {
    if (arg === "--apply") {
      apply = true;
    } else if (arg.startsWith("--query=")) {
      queryValue = arg.slice("--query=".length);
    } else if (arg.startsWith("--limit=")) {
      limitValue = arg.slice("--limit=".length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { apply, ...parseWikidataImportOptions(queryValue, limitValue) };
}

async function fetchWikidataJson(params: URLSearchParams): Promise<unknown> {
  const url = new URL(API_ROOT);
  for (const [key, value] of params) url.searchParams.set(key, value);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new Error(`Wikidata request failed.${detail}`, { cause: error });
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error(
      `Wikidata rate limited the request${retryAfter ? `; Retry-After: ${retryAfter}` : ""}. Stop and try later.`,
    );
  }
  if (!response.ok) {
    throw new Error(`Wikidata request failed with HTTP ${response.status}.`);
  }

  return response.json();
}

function entityParams(ids: readonly string[], props: "labels|aliases|claims" | "labels") {
  return new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props,
    languages: "en",
    format: "json",
  });
}

async function main() {
  const { apply, query, limit } = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  const searchParams = new URLSearchParams({
    action: "wbsearchentities",
    search: query,
    language: "en",
    type: "item",
    limit: String(limit),
    format: "json",
  });
  const searchIds = parseWikidataSearchIds(
    await fetchWikidataJson(searchParams),
    limit,
  );
  if (searchIds.length === 0) {
    console.info("No Wikidata items matched the search. No database writes performed.");
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
  const entities = parseWikidataEntities(
    await fetchWikidataJson(entityParams(searchIds, "labels|aliases|claims")),
  );
  const linkedIds = getLinkedWikidataIds(entities);
  const linkedLabels = new Map<string, string>();

  for (let offset = 0; offset < linkedIds.length; offset += ENTITY_BATCH_SIZE) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    const batch = linkedIds.slice(offset, offset + ENTITY_BATCH_SIZE);
    const response = await fetchWikidataJson(entityParams(batch, "labels"));
    for (const [id, label] of parseWikidataLabels(response)) {
      linkedLabels.set(id, label);
    }
  }

  const records: WikidataBookImportRecord[] = [];
  let rejected = 0;
  for (const entity of entities) {
    const record = mapWikidataNovel(entity, linkedLabels);
    if (record) {
      records.push(record);
    } else {
      rejected += 1;
    }
  }

  let written = 0;
  if (supabase && records.length > 0) {
    const { data, error } = await supabase.rpc("upsert_wikidata_novel_batch", {
      p_items: records,
    });
    if (error) throw new Error(`Failed to import Wikidata novel records: ${error.message}`);
    if (typeof data !== "number") {
      throw new Error("Wikidata import RPC returned an unexpected result.");
    }
    written = data;
  }

  console.info(
    `${apply ? "Import complete" : "Dry run complete"}: ${searchIds.length} candidates fetched, ${records.length} usable novels, ${rejected} rejected, ${written} written.`,
  );
  if (!apply) {
    console.info("Review preview (up to five usable records):");
    console.info(JSON.stringify(records.slice(0, 5), null, 2));
    console.info(
      "No database writes performed. Records remain pending_review after --apply; review and approve them separately.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    "Wikidata Books import failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
