export type ShareAttemptResult = "wrong" | "correct" | "skipped";

export type ShareResultInput = {
  vertical: "anime" | "movie";
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
  const mediaName = vertical === "movie" ? "Movies" : "Anime";
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
