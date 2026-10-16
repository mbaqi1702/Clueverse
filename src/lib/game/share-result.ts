export type ShareAttemptResult = "wrong" | "correct" | "skipped";

export type ShareResultInput = {
  vertical: "anime" | "movie" | "book";
  date: string;
  status: "won" | "lost";
  attempts: ShareAttemptResult[];
  maxAttempts: number;
};

export function formatShareResult({
  vertical,
  date,
  status,
  attempts,
  maxAttempts,
}: ShareResultInput): string {
  const mediaName = vertical === "movie" ? "Movies" : vertical === "book" ? "Books" : "Anime";
  const outcome = status === "won" ? "Solved" : "Not solved";
  const attemptResults = attempts
    .map((attempt) => {
      if (attempt === "correct") return "Correct";
      if (attempt === "skipped") return "Skipped";
      return "Miss";
    })
    .join(", ");

  return [
    `ClueVerse - ${mediaName} - ${date}`,
    `${outcome} in ${attempts.length}/${maxAttempts} attempts`,
    `Results: ${attemptResults}`,
  ].join("\n");
}
