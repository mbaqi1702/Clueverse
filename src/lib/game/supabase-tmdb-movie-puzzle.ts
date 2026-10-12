import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { DailyPuzzle } from "./content";
import { mapTmdbMoviePuzzleRow } from "./tmdb-movie-puzzle-mapper";

export async function getSupabaseTmdbMoviePuzzleForDate(date: string): Promise<DailyPuzzle> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Movie mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: assignedMediaId, error: assignmentError } = await supabase.rpc(
    "get_or_create_daily_tmdb_movie_puzzle",
    { p_puzzle_date: date },
  );
  if (assignmentError) {
    throw new Error(`Supabase daily movie puzzle assignment failed: ${assignmentError.message}`);
  }
  if (typeof assignedMediaId !== "string") {
    throw new Error("Supabase daily movie puzzle assignment returned an invalid media id.");
  }

  const { data, error } = await supabase
    .from("daily_movie_puzzles")
    .select(`
      puzzle_date,
      status,
      media:media!daily_movie_puzzles_media_id_fkey!inner(
        id,
        title,
        synopsis,
        media_type,
        review_status,
        release_year,
        format,
        media_aliases(alias),
        media_genres(genres(name)),
        media_sources!inner(provider, source_snapshot, tmdb_content_expires_at)
      )
    `)
    .eq("puzzle_date", date)
    .eq("media_id", assignedMediaId)
    .in("status", ["scheduled", "published"])
    .eq("media.media_type", "movie")
    .eq("media.review_status", "approved")
    .eq("media.media_sources.provider", "tmdb")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase daily movie puzzle lookup failed: ${error.message}`);
  }

  const puzzle = mapTmdbMoviePuzzleRow(data);
  if (!puzzle) {
    throw new Error(`No approved, playable TMDB movie is scheduled for ${date} (UTC).`);
  }
  return puzzle;
}
