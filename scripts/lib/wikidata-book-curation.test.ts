import { describe, expect, it } from "vitest";
import {
  validateWikidataBookCurationBatch,
  wikidataBookCurationBatch,
} from "./wikidata-book-curation";

describe("Wikidata book curation batch", () => {
  it("contains unique, answer-free synopses long enough for playable books", () => {
    expect(() => validateWikidataBookCurationBatch(wikidataBookCurationBatch)).not.toThrow();
    expect(new Set(wikidataBookCurationBatch.map((book) => book.providerId)).size).toBe(
      wikidataBookCurationBatch.length,
    );
    for (const book of wikidataBookCurationBatch) {
      expect(book.synopsis.trim().length).toBeGreaterThanOrEqual(80);
      expect(book.synopsis.toLocaleLowerCase()).not.toContain(book.title.toLocaleLowerCase());
    }
  });

  it("rejects duplicate source IDs and synopses that reveal the answer", () => {
    const first = wikidataBookCurationBatch[0];
    expect(() =>
      validateWikidataBookCurationBatch([
        first,
        { ...first, title: "A different title" },
      ]),
    ).toThrow("Duplicate Wikidata provider ID");
    expect(() =>
      validateWikidataBookCurationBatch([
        {
          ...first,
          synopsis: `This is a synopsis of ${first.title} with enough descriptive words to pass the minimum length requirement.`,
        },
      ]),
    ).toThrow("Synopsis includes its answer title");
  });
});
