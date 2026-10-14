import { NextResponse } from "next/server";
import { dailyPuzzle, getPublicPuzzle } from "@/lib/game/content";
import { compareGuessClues, evaluateGuess, evaluateSkip } from "@/lib/game/guess";
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
    return NextResponse.json(
      { error: "A guess or skip and an attempt number are required." },
      { status: 400 },
    );
  }

  const { guess, skip, attemptNumber } = body as {
    guess?: unknown;
    skip?: unknown;
    attemptNumber?: unknown;
  };
  const isSkip = skip === true;
  const guessText = typeof guess === "string" ? guess : "";
  if (
    (isSkip
      ? guess !== undefined
      : !guessText.trim() || guessText.length > 100) ||
    typeof attemptNumber !== "number" ||
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > dailyPuzzle.maxAttempts
  ) {
    return NextResponse.json(
      { error: "Enter a guess or skip, with a valid attempt number." },
      { status: 400 },
    );
  }

  const date = currentPuzzleDate();
  try {
    const puzzle = await getPuzzleForDate(date);
    if (attemptNumber > puzzle.maxAttempts) {
      return NextResponse.json(
        { error: "Enter a guess or skip, with a valid attempt number." },
        { status: 400, headers: noStore },
      );
    }

    const result = isSkip
      ? evaluateSkip(attemptNumber, puzzle)
      : evaluateGuess(guessText, attemptNumber, puzzle);
    if (!isSkip && !result.correct && process.env.GAME_DATA_SOURCE === "supabase") {
      let guessedClues: Awaited<ReturnType<typeof getSupabaseGuessClues>>;
      try {
        guessedClues = await getSupabaseGuessClues(guessText.trim(), puzzle.id, "anime");
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
