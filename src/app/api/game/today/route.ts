import { NextResponse } from "next/server";
import { getPublicPuzzle, dailyPuzzle } from "@/lib/game/content";
import { evaluateGuess } from "@/lib/game/guess";

export async function GET() {
  return NextResponse.json(getPublicPuzzle(dailyPuzzle), {
    headers: { "Cache-Control": "no-store" },
  });
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

  return NextResponse.json(evaluateGuess(guess, attemptNumber), {
    headers: { "Cache-Control": "no-store" },
  });
}
