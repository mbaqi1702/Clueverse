import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { DailyPuzzle } from "./content";
import { mapWikidataBookPuzzleRow } from "./wikidata-book-puzzle-mapper";

export async function getSupabaseWikidataBookPuzzleForDate(
  date: string,
): Promise<DailyPuzzle> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Books mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: assignedMediaId, error: assignmentError } = await supabase.rpc(
    "get_or_create_daily_wikidata_novel_puzzle",
    { p_puzzle_date: date },
  );
  if (assignmentError) {
    throw new Error(`Supabase daily book puzzle assignment failed: ${assignmentError.message}`);
  }
  if (typeof assignedMediaId !== "string") {
    throw new Error("Supabase daily book puzzle assignment returned an invalid media id.");
  }

  const { data, error } = await supabase
    .from("daily_book_puzzles")
    .select(`
      puzzle_date,
      status,
      media:media!daily_book_puzzles_media_id_fkey!inner(
        id,
        title,
        synopsis,
        media_type,
        review_status,
        format,
        media_aliases(alias),
        media_genres(genres(name)),
        media_book_authors(book_authors(name)),
        media_book_details(first_publication_year),
        media_sources!inner(provider)
      )
    `)
    .eq("puzzle_date", date)
    .eq("media_id", assignedMediaId)
    .in("status", ["scheduled", "published"])
    .eq("media.media_type", "book")
    .eq("media.review_status", "approved")
    .eq("media.format", "novel")
    .eq("media.media_sources.provider", "wikidata")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase daily book puzzle lookup failed: ${error.message}`);
  }

  const puzzle = mapWikidataBookPuzzleRow(data);
  if (!puzzle) {
    throw new Error(`No approved, playable Wikidata novel is scheduled for ${date} (UTC).`);
  }
  return puzzle;
}
