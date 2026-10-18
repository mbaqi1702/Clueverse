import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  validateWikidataBookCurationBatch,
  wikidataBookCurationBatch,
} from "./lib/wikidata-book-curation";

dotenv.config({ path: ".env.local" });

type MediaSourceRow = {
  media_id: string;
  provider_id: string;
  source_url: string;
};

type MediaRow = {
  id: string;
  title: string;
  synopsis: string | null;
  review_status: string;
  format: string | null;
};

function parseArgs(args: string[]) {
  let apply = false;
  for (const arg of args) {
    if (arg === "--apply") {
      apply = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return { apply };
}

async function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  validateWikidataBookCurationBatch(wikidataBookCurationBatch);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error(
      "Book curation requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const providerIds = wikidataBookCurationBatch.map((book) => book.providerId);
  const { data: sources, error: sourceError } = await supabase
    .from("media_sources")
    .select("media_id,provider_id,source_url")
    .eq("provider", "wikidata")
    .in("provider_id", providerIds);
  if (sourceError) {
    throw new Error(`Failed to read Wikidata book sources: ${sourceError.message}`);
  }
  if (!sources || sources.length !== wikidataBookCurationBatch.length) {
    throw new Error("Curation batch does not match the expected Wikidata source records.");
  }

  const sourceByProviderId = new Map(
    (sources as MediaSourceRow[]).map((source) => [source.provider_id, source]),
  );
  const mediaIds = wikidataBookCurationBatch.map((book) => {
    const source = sourceByProviderId.get(book.providerId);
    if (!source || source.source_url !== `https://www.wikidata.org/wiki/${book.providerId}`) {
      throw new Error(`Missing or unexpected Wikidata source for ${book.providerId}.`);
    }
    return source.media_id;
  });

  const [mediaResult, detailsResult, genresResult, authorsResult] = await Promise.all([
    supabase
      .from("media")
      .select("id,title,synopsis,review_status,format")
      .in("id", mediaIds),
    supabase.from("media_book_details").select("media_id").in("media_id", mediaIds),
    supabase.from("media_genres").select("media_id").in("media_id", mediaIds),
    supabase.from("media_book_authors").select("media_id").in("media_id", mediaIds),
  ]);
  if (mediaResult.error) {
    throw new Error(`Failed to read book records: ${mediaResult.error.message}`);
  }
  if (detailsResult.error) {
    throw new Error(`Failed to read book publication details: ${detailsResult.error.message}`);
  }
  if (genresResult.error) {
    throw new Error(`Failed to read book genres: ${genresResult.error.message}`);
  }
  if (authorsResult.error) {
    throw new Error(`Failed to read book authors: ${authorsResult.error.message}`);
  }

  const mediaById = new Map(
    ((mediaResult.data ?? []) as MediaRow[]).map((media) => [media.id, media]),
  );
  const detailIds = new Set((detailsResult.data ?? []).map((detail) => detail.media_id));
  const genreIds = new Set((genresResult.data ?? []).map((genre) => genre.media_id));
  const authorIds = new Set((authorsResult.data ?? []).map((author) => author.media_id));
  const ready: (typeof wikidataBookCurationBatch[number] & { mediaId: string })[] = [];
  const alreadyApplied: string[] = [];

  for (const book of wikidataBookCurationBatch) {
    const source = sourceByProviderId.get(book.providerId)!;
    const media = mediaById.get(source.media_id);
    if (
      !media ||
      media.title !== book.title ||
      media.format !== "novel" ||
      !detailIds.has(media.id) ||
      !genreIds.has(media.id) ||
      !authorIds.has(media.id)
    ) {
      throw new Error(`Book metadata does not match the reviewed batch: ${book.title}.`);
    }
    if (media.review_status === "approved" && media.synopsis === book.synopsis) {
      alreadyApplied.push(book.title);
      continue;
    }
    if (media.review_status !== "pending_review" || media.synopsis !== null) {
      throw new Error(`Refusing to overwrite a reviewed book record: ${book.title}.`);
    }
    ready.push({ ...book, mediaId: media.id });
  }

  console.info(
    `Books ready to approve: ${ready.length}; already applied: ${alreadyApplied.length}.`,
  );
  for (const book of ready) {
    console.info(`- ${book.title}: ${book.synopsis}`);
  }

  if (!apply) {
    console.info("Dry run only; no database writes performed. Use --apply to approve this batch.");
    return;
  }

  for (const book of ready) {
    const { data, error } = await supabase
      .from("media")
      .update({
        synopsis: book.synopsis,
        review_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", book.mediaId)
      .eq("review_status", "pending_review")
      .is("synopsis", null)
      .select("id");
    if (error) {
      throw new Error(`Failed to approve ${book.title}: ${error.message}`);
    }
    if (data?.length !== 1) {
      throw new Error(`Book approval did not update exactly one record: ${book.title}.`);
    }
  }

  const { data: verifiedRows, error: verificationError } = await supabase
    .from("media")
    .select("id,title,synopsis,review_status")
    .in(
      "id",
      wikidataBookCurationBatch.map((book) => sourceByProviderId.get(book.providerId)!.media_id),
    );
  if (verificationError) {
    throw new Error(`Book approval verification failed: ${verificationError.message}`);
  }
  const verifiedById = new Map(
    (
      (verifiedRows ?? []) as Pick<MediaRow, "id" | "title" | "synopsis" | "review_status">[]
    ).map((media) => [media.id, media]),
  );
  for (const book of wikidataBookCurationBatch) {
    const mediaId = sourceByProviderId.get(book.providerId)!.media_id;
    const media = verifiedById.get(mediaId);
    if (
      !media ||
      media.title !== book.title ||
      media.review_status !== "approved" ||
      media.synopsis !== book.synopsis
    ) {
      throw new Error(`Book approval verification failed for ${book.title}.`);
    }
  }

  console.info(`Approved and verified ${wikidataBookCurationBatch.length} Wikidata novels.`);
}

main().catch((error: unknown) => {
  console.error(
    "Wikidata book curation failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
