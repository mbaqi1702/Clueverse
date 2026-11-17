import { NextResponse } from "next/server";
import { getCharacterPuzzleForDate } from "@/lib/game/character-content";
import { getPublicPuzzle } from "@/lib/game/content";
import { evaluateGuess, evaluateSkip } from "@/lib/game/guess";

const noStore = { "Cache-Control": "no-store" };

function currentPuzzleDate() {
  return new Date().toISOString().slice(0, 10);
}

function unavailableResponse(error: unknown) {
  console.error("Could not retrieve the configured daily character puzzle.", error);
  return NextResponse.json(
    { error: "Today's character puzzle is currently unavailable. Please try again later." },
    { status: 503, headers: noStore },
  );
}

export async function GET() {
  const date = currentPuzzleDate();
  try {
    return NextResponse.json(
      getPublicPuzzle(getCharacterPuzzleForDate(date), date),
      { headers: noStore },
    );
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
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400, headers: noStore },
      );
    }
    throw error;
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "A guess or skip and an attempt number are required." },
      { status: 400, headers: noStore },
    );
  }

  const { guess, skip, attemptNumber } = body as {
    guess?: unknown;
    skip?: unknown;
    attemptNumber?: unknown;
  };
  const isSkip = skip === true;
  const guessText = typeof guess === "string" ? guess : "";
  const puzzle = getCharacterPuzzleForDate(currentPuzzleDate());

  if (
    (isSkip ? guess !== undefined : !guessText.trim() || guessText.length > 100) ||
    typeof attemptNumber !== "number" ||
    !Number.isInteger(attemptNumber) ||
    attemptNumber < 1 ||
    attemptNumber > puzzle.maxAttempts
  ) {
    return NextResponse.json(
      { error: "Enter a guess or skip, with a valid attempt number." },
      { status: 400, headers: noStore },
    );
  }

  const result = isSkip
    ? evaluateSkip(attemptNumber, puzzle)
    : evaluateGuess(guessText, attemptNumber, puzzle);
  return NextResponse.json(result, { headers: noStore });
}
