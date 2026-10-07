import "server-only";

import { createClient } from "@supabase/supabase-js";
import { mapSupabasePuzzleRow } from "./supabase-puzzle-mapper";

export async function getSupabasePuzzleForDate(date: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Supabase mode requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase
    .from("daily_puzzles")
    .select(`
      puzzle_date,
      status,
      media:media!daily_puzzles_media_id_fkey!inner(
        id,
        title,
        synopsis,
        media_type,
        review_status,
        release_year,
        episode_count,
        format,
        content_rating,
        media_aliases(alias),
        media_genres(genres(name)),
        media_studios(studios(name))
      )
    `)
    .eq("puzzle_date", date)
    .in("status", ["scheduled", "published"])
    .eq("media.media_type", "anime")
    .eq("media.review_status", "approved")
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase daily puzzle lookup failed: ${error.message}`);
  }

  return mapSupabasePuzzleRow(data);
}
