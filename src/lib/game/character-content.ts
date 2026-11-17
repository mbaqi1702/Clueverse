import type { DailyPuzzle } from "@/lib/game/content";

const characterPuzzles: DailyPuzzle[] = [
  {
    id: "classic-character-alice",
    answer: "Alice",
    acceptedGuesses: ["Alice Liddell"],
    synopsis:
      "A curious child follows a hurried stranger and tumbles into a place where ordinary rules seem to stop working.",
    clues: [
      { label: "A curious chase", value: "Her adventure begins when she follows a waistcoat-wearing white rabbit." },
      { label: "Ups and downs", value: "A small cake and a bottle repeatedly change her size." },
      { label: "An unusual gathering", value: "She finds herself at a tea party where one guest is always late." },
      { label: "The final court", value: "A playing-card monarch rules this strange land." },
    ],
    maxAttempts: 5,
  },
  {
    id: "classic-character-holmes",
    answer: "Sherlock Holmes",
    acceptedGuesses: ["Holmes"],
    synopsis:
      "An observant London investigator solves baffling cases by noticing details that everyone else overlooks.",
    clues: [
      { label: "A familiar address", value: "His home is at 221B Baker Street." },
      { label: "A trusted companion", value: "Many of his cases are recorded by Dr. Watson." },
      { label: "A methodical mind", value: "He relies on close observation and deduction to solve mysteries." },
      { label: "A creator's signature", value: "Arthur Conan Doyle created this consulting detective." },
    ],
    maxAttempts: 5,
  },
  {
    id: "classic-character-dracula",
    answer: "Count Dracula",
    acceptedGuesses: ["Dracula", "The Count"],
    synopsis:
      "A mysterious nobleman leaves his remote home for England, where a determined group joins forces against him.",
    clues: [
      { label: "A distant home", value: "His castle stands in Transylvania." },
      { label: "An unsettling guest", value: "A young English solicitor travels to meet him on business." },
      { label: "An old fear", value: "He is a vampire who preys on the living." },
      { label: "A literary origin", value: "Bram Stoker introduced this count in an 1897 novel." },
    ],
    maxAttempts: 5,
  },
];

export function getCharacterPuzzleForDate(date: string): DailyPuzzle {
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new RangeError("Character puzzle date must be a valid UTC calendar date.");
  }

  const utcDay = Math.floor(timestamp / 86_400_000);
  const index = ((utcDay % characterPuzzles.length) + characterPuzzles.length) % characterPuzzles.length;
  return characterPuzzles[index];
}
