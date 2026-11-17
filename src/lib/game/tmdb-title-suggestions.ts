import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  rankTitleSuggestions,
  TITLE_SUGGESTION_CANDIDATE_LIMIT,
} from "@/lib/game/title-suggestions";

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
  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const pattern = `%${escapedQuery}%`;
  const [assignmentResult, titleResult, originalTitleResult, aliasResult] = await Promise.all([
    supabase
      .from("daily_movie_puzzles")
      .select("media_id")
      .eq("puzzle_date", puzzleDate)
      .in("status", ["scheduled", "published"])
      .maybeSingle(),
    supabase
      .from("media")
      .select("id, title, original_title, media_sources!inner(provider, tmdb_content_expires_at)")
      .eq("media_type", "movie")
      .eq("review_status", "approved")
      .eq("media_sources.provider", "tmdb")
      .gt("media_sources.tmdb_content_expires_at", new Date().toISOString())
      .ilike("title", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
    supabase
      .from("media")
      .select("id, title, original_title, media_sources!inner(provider, tmdb_content_expires_at)")
      .eq("media_type", "movie")
      .eq("review_status", "approved")
      .eq("media_sources.provider", "tmdb")
      .gt("media_sources.tmdb_content_expires_at", new Date().toISOString())
      .ilike("original_title", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
    supabase
      .from("media")
      .select("id, title, original_title, media_aliases!inner(alias), media_sources!inner(provider, tmdb_content_expires_at)")
      .eq("media_type", "movie")
      .eq("review_status", "approved")
      .eq("media_sources.provider", "tmdb")
      .gt("media_sources.tmdb_content_expires_at", new Date().toISOString())
      .ilike("media_aliases.alias", pattern)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
  ]);

  if (assignmentResult.error) {
    throw new Error(`Supabase daily movie lookup failed: ${assignmentResult.error.message}`);
  }
  const activeAnswerId = assignmentResult.data?.media_id;
  if (typeof activeAnswerId !== "string") {
    throw new Error(`No approved movie is scheduled for ${puzzleDate} (UTC).`);
  }
  if (titleResult.error) {
    throw new Error(`Supabase movie title search failed: ${titleResult.error.message}`);
  }

  if (originalTitleResult.error) {
    throw new Error(`Supabase movie original title search failed: ${originalTitleResult.error.message}`);
  }
  if (aliasResult.error) {
    throw new Error(`Supabase movie alias search failed: ${aliasResult.error.message}`);
  }

  return rankTitleSuggestions(
    [
      ...(titleResult.data ?? []),
      ...(originalTitleResult.data ?? []),
      ...(aliasResult.data ?? []),
    ],
    activeAnswerId,
    query,
  );
}
