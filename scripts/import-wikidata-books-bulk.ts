import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  getLinkedWikidataIds,
  mapWikidataNovel,
  parseWikidataEntities,
  parseWikidataLabels,
  parseWikidataSparqlIds,
  type WikidataBookImportRecord,
} from "./lib/wikidata-books";

dotenv.config({ path: ".env.local" });

const SPARQL_ROOT = "https://query.wikidata.org/sparql";
const API_ROOT = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "ClueVerse/0.1 (+https://github.com/mbaqi1702/Clueverse)";
const REQUEST_DELAY_MS = 1_000;
const BATCH_SIZE = 50;
const MAX_BULK_LIMIT = 200;

function parseArgs(args: string[]) {
  let apply = false;
  let limit = 50;

  for (const arg of args) {
    if (arg === "--apply") {
      apply = true;
    } else if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_BULK_LIMIT) {
    throw new RangeError(`Bulk limit must be an integer from 1 to ${MAX_BULK_LIMIT}.`);
  }
  return { apply, limit };
}

async function fetchJson(url: URL, accept: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(60_000),
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

async function waitBeforeRequest() {
  await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
}

function entityUrl(ids: readonly string[], props: "labels|aliases|claims" | "labels") {
  const url = new URL(API_ROOT);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    ids: ids.join("|"),
    props,
    languages: "en",
    format: "json",
  }).toString();
  return url;
}

async function main() {
  const { apply, limit } = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (apply && (!supabaseUrl || !supabaseSecret)) {
    throw new Error(
      "Apply mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  const query = `
    SELECT DISTINCT ?work WHERE {
      ?work wdt:P31 wd:Q7725634;
            wdt:P407 wd:Q1860;
            wdt:P50 ?author;
            wdt:P136 ?genre;
            wdt:P577 ?publication.
    }
    LIMIT ${limit}
  `;
  const sparqlUrl = new URL(SPARQL_ROOT);
  sparqlUrl.search = new URLSearchParams({ query, format: "json" }).toString();
  const ids = parseWikidataSparqlIds(
    await fetchJson(sparqlUrl, "application/sparql-results+json"),
    limit,
  );
  if (ids.length === 0) {
    console.info("No matching Wikidata novel entities found. No database writes performed.");
    return;
  }

  const entities = [];
  for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
    if (offset > 0) await waitBeforeRequest();
    const batch = ids.slice(offset, offset + BATCH_SIZE);
    entities.push(
      ...parseWikidataEntities(
        await fetchJson(entityUrl(batch, "labels|aliases|claims"), "application/json"),
      ),
    );
  }
  const linkedIds = getLinkedWikidataIds(entities);
  const linkedLabels = new Map<string, string>();

  for (let offset = 0; offset < linkedIds.length; offset += BATCH_SIZE) {
    await waitBeforeRequest();
    const batch = linkedIds.slice(offset, offset + BATCH_SIZE);
    const labels = parseWikidataLabels(
      await fetchJson(entityUrl(batch, "labels"), "application/json"),
    );
    for (const [id, label] of labels) linkedLabels.set(id, label);
  }

  const records: WikidataBookImportRecord[] = [];
  for (const entity of entities) {
    const record = mapWikidataNovel(entity, linkedLabels);
    if (record) records.push(record);
  }

  let upserted = 0;
  if (apply && records.length > 0) {
    const supabase = createClient(supabaseUrl!, supabaseSecret!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.rpc("upsert_wikidata_novel_batch", {
      p_items: records,
    });
    if (error) throw new Error(`Failed to import Wikidata novel records: ${error.message}`);
    if (typeof data !== "number") {
      throw new Error("Wikidata import RPC returned an unexpected result.");
    }
    upserted = data;
  }

  console.info(
    `${apply ? "Bulk import complete" : "Bulk dry run complete"}: ${ids.length} entities queried, ${records.length} playable-metadata candidates, ${ids.length - records.length} rejected, ${upserted} records upserted.`,
  );
  if (!apply) {
    console.info("Review preview (up to 20 candidates):");
    console.info(JSON.stringify(records.slice(0, 20), null, 2));
    console.info("No database writes performed. --apply imports candidates as pending_review; it does not add synopses or approve titles.");
  }
}

main().catch((error: unknown) => {
  console.error(
    "Bulk Wikidata Books import failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
