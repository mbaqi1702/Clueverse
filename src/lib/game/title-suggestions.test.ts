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
});
