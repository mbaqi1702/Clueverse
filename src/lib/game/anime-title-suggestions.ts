import "server-only";

import { createClient } from "@supabase/supabase-js";

const MAX_SUGGESTIONS = 8;

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
  const { data: assignment, error: assignmentError } = await supabase
    .from("daily_puzzles")
    .select("media_id")
    .eq("puzzle_date", puzzleDate)
    .in("status", ["scheduled", "published"])
    .maybeSingle();

  if (assignmentError) {
    throw new Error(`Supabase daily puzzle lookup failed: ${assignmentError.message}`);
  }
  if (typeof assignment?.media_id !== "string") {
    throw new Error(`No approved puzzle is scheduled for ${puzzleDate} (UTC).`);
  }

  const escapedQuery = query.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("media")
    .select("title")
    .eq("media_type", "anime")
    .eq("review_status", "approved")
    .neq("id", assignment.media_id)
    .ilike("title", `${escapedQuery}%`)
    .order("title", { ascending: true })
    .limit(MAX_SUGGESTIONS);

  if (error) {
    throw new Error(`Supabase anime title search failed: ${error.message}`);
  }

  return (data ?? [])
    .map((row) => row.title)
    .filter((title): title is string => typeof title === "string");
}
