import { dailyBookPuzzle, type DailyPuzzle } from "./content";

export async function getBookPuzzleForDate(date: string): Promise<DailyPuzzle> {
  const source = process.env.GAME_DATA_SOURCE || "sample";
  if (source === "sample") return dailyBookPuzzle;
  if (source !== "supabase") {
    throw new Error("GAME_DATA_SOURCE must be either 'sample' or 'supabase'.");
  }

  const { getSupabaseWikidataBookPuzzleForDate } = await import(
    "./supabase-wikidata-book-puzzle"
  );
  return getSupabaseWikidataBookPuzzleForDate(date);
}
