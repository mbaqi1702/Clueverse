import type { Metadata } from "next";
import { GameClient } from "@/components/game-client";

export const metadata: Metadata = {
  title: "ClueVerse | Who’s That Character?",
  description: "Use original progressive clues to identify a character from classic literature.",
};

export default function CharactersPage() {
  return <GameClient vertical="character" />;
}
