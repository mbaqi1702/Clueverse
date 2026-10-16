import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";

export const metadata: Metadata = {
  title: "ClueVerse | Daily book puzzle",
  description: "Read the original synopsis, follow the clues, and name today's novel.",
};

export default function BooksPage() {
  return <GameClient vertical="book" />;
}
