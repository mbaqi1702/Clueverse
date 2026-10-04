export type Clue = {
  label: string;
  value: string;
};

export type DailyPuzzle = {
  id: string;
  answer: string;
  acceptedGuesses: string[];
  synopsis: string;
  clues: Clue[];
  maxAttempts: number;
};

export type PublicPuzzle = Pick<
  DailyPuzzle,
  "id" | "synopsis" | "maxAttempts"
> & {
  date: string;
};

export const dailyPuzzle: DailyPuzzle = {
  id: "sample-001",
  answer: "The Lanterns of Kisaragi",
  acceptedGuesses: ["the lanterns of kisaragi", "lanterns of kisaragi"],
  synopsis:
    "In a city where night lasts most of the year, a trainee cartographer maps a moving coastline and discovers that every new island carries a memory someone thought was lost.",
  clues: [
    { label: "Genre", value: "Mystery · Adventure" },
    { label: "The central craft", value: "Drawing maps by hand" },
    { label: "A recurring landmark", value: "A lighthouse that appears on no chart" },
    { label: "The title begins with", value: "The Lanterns…" },
  ],
  maxAttempts: 5,
};

export function getPublicPuzzle(
  puzzle: DailyPuzzle,
  date = new Date().toISOString().slice(0, 10),
): PublicPuzzle {
  return {
    id: puzzle.id,
    date,
    synopsis: puzzle.synopsis,
    maxAttempts: puzzle.maxAttempts,
  };
}
