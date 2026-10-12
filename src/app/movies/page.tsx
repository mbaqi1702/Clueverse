import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";

export const metadata: Metadata = {
  title: "ClueVerse | Daily movie puzzle",
  description: "Read the synopsis, follow the clues, and name today's movie.",
};

export default function MoviesPage() {
  return <GameClient vertical="movie" />;
}
