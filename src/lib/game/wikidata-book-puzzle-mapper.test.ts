import { describe, expect, it } from "vitest";
import { mapWikidataBookPuzzleRow } from "./wikidata-book-puzzle-mapper";

const row = {
  status: "scheduled",
  media: {
    id: "book-id",
    title: "Reviewed novel",
    synopsis:
      "An original, human-written synopsis longer than eighty characters that does not copy provider descriptions or any text from the source work.",
    media_type: "book",
    review_status: "approved",
    format: "novel",
    media_aliases: [{ alias: "Alternate novel title" }],
    media_genres: [{ genres: { name: "Mystery" } }, { genres: { name: "Fantasy" } }],
    media_book_authors: [{ book_authors: { name: "A. Writer" } }],
    media_book_details: { first_publication_year: 1818 },
    media_sources: { provider: "wikidata" },
  },
};

describe("mapWikidataBookPuzzleRow", () => {
  it("maps a separately reviewed novel to private clues", () => {
    expect(mapWikidataBookPuzzleRow(row)).toEqual({
      id: "book-id",
      answer: "Reviewed novel",
      acceptedGuesses: ["Alternate novel title"],
      synopsis: row.media.synopsis,
      clues: [
        { label: "Genre", value: "Mystery · Fantasy" },
        { label: "Publication year", value: "1818" },
        { label: "Author", value: "A. Writer" },
      ],
      maxAttempts: 4,
    });
  });

  it("rejects unapproved or ineligible scheduled content", () => {
    expect(mapWikidataBookPuzzleRow(null)).toBeNull();
    expect(() =>
      mapWikidataBookPuzzleRow({
        ...row,
        media: { ...row.media, review_status: "pending_review" },
      }),
    ).toThrow("approved novel media");
    expect(() =>
      mapWikidataBookPuzzleRow({
        ...row,
        media: { ...row.media, media_sources: { provider: "google_books" } },
      }),
    ).toThrow("Wikidata provenance");
    expect(() =>
      mapWikidataBookPuzzleRow({
        ...row,
        media: { ...row.media, synopsis: null },
      }),
    ).toThrow("original synopsis");
  });
});
