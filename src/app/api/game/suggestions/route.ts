import { NextResponse } from "next/server";
import { getAnimeTitleSuggestions } from "@/lib/game/anime-title-suggestions";

const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 100) {
    return NextResponse.json(
      { error: "Search text must be 100 characters or fewer." },
      { status: 400, headers: noStore },
    );
  }
  if (!query) {
    return NextResponse.json({ suggestions: [] }, { headers: noStore });
  }

  const source = process.env.GAME_DATA_SOURCE || "sample";
  if (source === "sample") {
    return NextResponse.json({ suggestions: [] }, { headers: noStore });
  }

  if (source !== "supabase") {
    console.error("Could not retrieve title suggestions.", new Error("Invalid GAME_DATA_SOURCE configuration."));
    return NextResponse.json(
      { error: "Title suggestions are temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }

  try {
    const puzzleDate = new Date().toISOString().slice(0, 10);
    const suggestions = await getAnimeTitleSuggestions(query, puzzleDate);
    return NextResponse.json({ suggestions }, { headers: noStore });
  } catch (error) {
    console.error("Could not retrieve title suggestions.", error);
    return NextResponse.json(
      { error: "Title suggestions are temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }
}
