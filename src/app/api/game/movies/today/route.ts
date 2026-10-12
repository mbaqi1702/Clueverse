import { NextResponse } from "next/server";
import { getPublicPuzzle } from "@/lib/game/content";
import { evaluateGuess } from "@/lib/game/guess";
import { getSupabaseTmdbMoviePuzzleForDate } from "@/lib/game/supabase-tmdb-movie-puzzle";
import { TMDB_MOVIE_MAX_ATTEMPTS } from "@/lib/game/tmdb-movie-puzzle-mapper";

const noStore = { "Cache-Control": "no-store" };

function currentPuzzleDate() {
  return new Date().toISOString().slice(0, 10);
}

async function getMoviePuzzleForDate(date: string) {
  if ((process.env.GAME_DATA_SOURCE || "sample") !== "supabase") {
    throw new Error("The TMDB movie game requires GAME_DATA_SOURCE=supabase.");
  }
  return getSupabaseTmdbMoviePuzzleForDate(date);
}

function unavailableResponse(error: unknown) {
  console.error("Could not retrieve the configured daily movie puzzle.", error);
  return NextResponse.json(
    { error: "Today's movie puzzle is currently unavailable. Please try again later." },
    { status: 503, headers: noStore },
  );
}

export async function GET() {
  const date = currentPuzzleDate();
  try {
    const puzzle = await getMoviePuzzleForDate(date);
    return NextResponse.json(getPublicPuzzle(puzzle, date), { headers: noStore });
  } catch (error) {
    return unavailableResponse(error);
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "A guess and attempt number are required." }, { status: 400 });
  }

  const { guess, attemptNumber } = body as { guess?: unknown; attemptNumber?: unknown };
  if (
    typeof guess !== "string" ||
    typeof attemptNumber !== "number" ||
    guess.trim().length === 0 ||
    guess.length > 100 ||
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > TMDB_MOVIE_MAX_ATTEMPTS
  ) {
    return NextResponse.json(
      { error: "Enter a guess of 1–100 characters and a valid attempt number." },
      { status: 400, headers: noStore },
    );
  }

  const date = currentPuzzleDate();
  try {
    const puzzle = await getMoviePuzzleForDate(date);
    if (attemptNumber > puzzle.maxAttempts) {
      return NextResponse.json(
        { error: "Enter a guess of 1–100 characters and a valid attempt number." },
        { status: 400, headers: noStore },
      );
    }
    return NextResponse.json(evaluateGuess(guess, attemptNumber, puzzle), { headers: noStore });
  } catch (error) {
    return unavailableResponse(error);
  }
}
