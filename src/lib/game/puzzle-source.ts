import { dailyPuzzle, type DailyPuzzle } from "./content";

export async function getPuzzleForDate(date: string): Promise<DailyPuzzle> {
  const source = process.env.GAME_DATA_SOURCE || "sample";
  if (source === "sample") return dailyPuzzle;
  if (source !== "supabase") {
    throw new Error("GAME_DATA_SOURCE must be either 'sample' or 'supabase'.");
  }

  const { getSupabasePuzzleForDate } = await import("./supabase-puzzle");
  const puzzle = await getSupabasePuzzleForDate(date);
  if (!puzzle) {
    throw new Error(`No approved puzzle is scheduled for ${date} (UTC).`);
  }
  return puzzle;
}
