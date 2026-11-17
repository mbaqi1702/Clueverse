import { describe, expect, it } from "vitest";
import { rankTitleSuggestions } from "./title-suggestions";

describe("rankTitleSuggestions", () => {
  it("prioritizes title beginnings, removes the answer and duplicate titles", () => {
    expect(
      rankTitleSuggestions(
        [
          { id: "partial", title: "My Hero Academia" },
          { id: "answer", title: "Hero Quest" },
          { id: "prefix", title: "Hero Academia" },
          { id: "duplicate", title: "Hero Academia" },
        ],
        "answer",
        "hero",
      ),
    ).toEqual(["Hero Academia", "My Hero Academia"]);
  });

  it("limits the ranked results", () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: `title-${index}`,
      title: `Title ${index}`,
    }));

    expect(rankTitleSuggestions(rows, "not-present", "title")).toHaveLength(8);
  });

  it("finds canonical titles using original titles and stored aliases", () => {
    expect(
      rankTitleSuggestions(
        [{
          id: "alias-title",
          title: "Cowboy Bebop",
          media_aliases: [{ alias: "カウボーイビバップ" }],
        }],
        "no-active-answer",
        "カウボーイ",
      ),
    ).toEqual(["Cowboy Bebop"]);
    expect(
      rankTitleSuggestions(
        [{
          id: "original-title",
          title: "Fullmetal Alchemist: Brotherhood",
          original_title: "鋼の錬金術師",
        }],
        "no-active-answer",
        "錬金術",
      ),
    ).toEqual(["Fullmetal Alchemist: Brotherhood"]);
  });
});
