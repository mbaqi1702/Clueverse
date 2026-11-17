import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  rankTitleSuggestions,
  TITLE_SUGGESTION_CANDIDATE_LIMIT,
} from "@/lib/game/title-suggestions";

export async function getWikidataBookTitleSuggestions(
  query: string,
  puzzleDate: string,
): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Book title suggestions require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escapedQuery}%`;
  const [assignmentResult, titleResult, originalTitleResult, aliasResult] = await Promise.all([
    supabase.rpc("get_or_create_daily_wikidata_novel_puzzle", {
      p_puzzle_date: puzzleDate,
    }),
    supabase
      .from("media")
      .select(`
        id,
        title,
        original_title,
        media_sources!inner(provider),
        media_book_details!inner(first_publication_year),
        media_genres!inner(genre_id),
        media_book_authors!inner(author_id)
      `)
      .eq("media_type", "book")
      .eq("review_status", "approved")
      .eq("format", "novel")
      .eq("media_sources.provider", "wikidata")
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
    supabase
      .from("media")
      .select(`
        id,
        title,
        original_title,
        media_sources!inner(provider),
        media_book_details!inner(first_publication_year),
        media_genres!inner(genre_id),
        media_book_authors!inner(author_id)
      `)
      .eq("media_type", "book")
      .eq("review_status", "approved")
      .eq("format", "novel")
      .eq("media_sources.provider", "wikidata")
      .ilike("original_title", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
    supabase
      .from("media")
      .select(`
        id,
        title,
        original_title,
        media_aliases!inner(alias),
        media_sources!inner(provider),
        media_book_details!inner(first_publication_year),
        media_genres!inner(genre_id),
        media_book_authors!inner(author_id)
      `)
      .eq("media_type", "book")
      .eq("review_status", "approved")
      .eq("format", "novel")
      .eq("media_sources.provider", "wikidata")
      .ilike("media_aliases.alias", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
  ]);

  if (assignmentResult.error) {
    throw new Error(`Supabase daily book assignment failed: ${assignmentResult.error.message}`);
  }
  if (typeof assignmentResult.data !== "string") {
    throw new Error(`No approved book is scheduled for ${puzzleDate} (UTC).`);
  }
  if (titleResult.error) {
    throw new Error(`Supabase book title search failed: ${titleResult.error.message}`);
  }

  if (originalTitleResult.error) {
    throw new Error(`Supabase book original title search failed: ${originalTitleResult.error.message}`);
  }
  if (aliasResult.error) {
    throw new Error(`Supabase book alias search failed: ${aliasResult.error.message}`);
  }

  return rankTitleSuggestions(
    [
      ...(titleResult.data ?? []),
      ...(originalTitleResult.data ?? []),
      ...(aliasResult.data ?? []),
    ],
    assignmentResult.data,
    query,
  );
}
