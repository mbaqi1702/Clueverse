import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  rankTitleSuggestions,
  TITLE_SUGGESTION_CANDIDATE_LIMIT,
} from "@/lib/game/title-suggestions";

export async function getAnimeTitleSuggestions(
  query: string,
  puzzleDate: string,
): Promise<string[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Supabase title suggestions require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [assignmentResult, titleResult] = await Promise.all([
    supabase
      .from("daily_puzzles")
      .select("media_id")
      .eq("puzzle_date", puzzleDate)
      .in("status", ["scheduled", "published"])
      .maybeSingle(),
    supabase
      .from("media")
      .select("id, title")
      .eq("media_type", "anime")
      .eq("review_status", "approved")
      .ilike("title", `%${query.replace(/[\\%_]/g, "\\$&")}%`)
      .order("title", { ascending: true })
      .limit(TITLE_SUGGESTION_CANDIDATE_LIMIT),
  ]);

  if (assignmentResult.error) {
    throw new Error(`Supabase daily puzzle lookup failed: ${assignmentResult.error.message}`);
  }
  const activeAnswerId = assignmentResult.data?.media_id;
  if (typeof activeAnswerId !== "string") {
    throw new Error(`No approved puzzle is scheduled for ${puzzleDate} (UTC).`);
  }
  if (titleResult.error) {
    throw new Error(`Supabase anime title search failed: ${titleResult.error.message}`);
  }

  return rankTitleSuggestions(titleResult.data ?? [], activeAnswerId, query);
}
