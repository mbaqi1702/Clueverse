import { NextResponse } from "next/server";
import { dailyPuzzle, getPublicPuzzle } from "@/lib/game/content";
import { compareGuessClues, evaluateGuess } from "@/lib/game/guess";
import { getPuzzleForDate } from "@/lib/game/puzzle-source";
import { getSupabaseGuessClues } from "@/lib/game/supabase-guess-clues";

const noStore = { "Cache-Control": "no-store" };

function currentPuzzleDate() {
  return new Date().toISOString().slice(0, 10);
}

function unavailableResponse(error: unknown) {
  console.error("Could not retrieve the configured daily puzzle.", error);
  return NextResponse.json(
    { error: "Today's puzzle is currently unavailable. Please try again later." },
    { status: 503, headers: noStore },
  );
}

export async function GET() {
  const date = currentPuzzleDate();
  try {
    const puzzle = await getPuzzleForDate(date);
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

  const { guess, attemptNumber } = body as {
    guess?: unknown;
    attemptNumber?: unknown;
  };
  if (
    typeof guess !== "string" ||
    typeof attemptNumber !== "number" ||
    guess.trim().length === 0 ||
    guess.length > 100 ||
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > dailyPuzzle.maxAttempts
  ) {
    return NextResponse.json(
      { error: "Enter a guess of 1–100 characters and a valid attempt number." },
      { status: 400 },
    );
  }

  const date = currentPuzzleDate();
  try {
    const puzzle = await getPuzzleForDate(date);
    if (attemptNumber > puzzle.maxAttempts) {
      return NextResponse.json(
        { error: "Enter a guess of 1–100 characters and a valid attempt number." },
        { status: 400, headers: noStore },
      );
    }

    const result = evaluateGuess(guess, attemptNumber, puzzle);
    if (!result.correct && process.env.GAME_DATA_SOURCE === "supabase") {
      let guessedClues: Awaited<ReturnType<typeof getSupabaseGuessClues>>;
      try {
        guessedClues = await getSupabaseGuessClues(guess.trim(), puzzle.id, "anime");
      } catch (error) {
        console.error("Could not compare the submitted anime guess.", error);
        return NextResponse.json(
          { error: "Your guess could not be checked. Please try again." },
          { status: 503, headers: noStore },
        );
      }
      result.comparison = guessedClues
        ? compareGuessClues(puzzle.clues, guessedClues)
        : { available: false, fields: [] };
    }
    return NextResponse.json(result, { headers: noStore });
  } catch (error) {
    return unavailableResponse(error);
  }
}
