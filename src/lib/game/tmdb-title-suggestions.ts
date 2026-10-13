import "server-only";

import { createClient } from "@supabase/supabase-js";

const MAX_SUGGESTIONS = 8;

export async function getTmdbMovieTitleSuggestions(
  query: string,
  puzzleDate: string,
): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Movie title suggestions require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: assignment, error: assignmentError } = await supabase
    .from("daily_movie_puzzles")
    .select("media_id")
    .eq("puzzle_date", puzzleDate)
    .in("status", ["scheduled", "published"])
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`Supabase daily movie lookup failed: ${assignmentError.message}`);
  }
  if (typeof assignment?.media_id !== "string") {
    throw new Error(`No approved movie is scheduled for ${puzzleDate} (UTC).`);
  }

  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("media")
    .select("title, media_sources!inner(provider, tmdb_content_expires_at)")
    .eq("media_type", "movie")
    .eq("review_status", "approved")
    .neq("id", assignment.media_id)
    .eq("media_sources.provider", "tmdb")
    .gt("media_sources.tmdb_content_expires_at", new Date().toISOString())
    .ilike("title", `${escapedQuery}%`)
    .order("title", { ascending: true })
    .limit(MAX_SUGGESTIONS);

  if (error) {
    throw new Error(`Supabase movie title search failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => row.title)
    .filter((title): title is string => typeof title === "string");
}
