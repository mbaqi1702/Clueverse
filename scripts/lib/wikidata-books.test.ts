import { describe, expect, it } from "vitest";
import {
  getLinkedWikidataIds,
  mapWikidataNovel,
  parseWikidataEntities,
  parseWikidataImportOptions,
  parseWikidataLabels,
  parseWikidataSearchIds,
  parseWikidataSparqlIds,
} from "./wikidata-books";

const novel = {
  id: "Q150827",
  labels: { en: { value: "Frankenstein; or, The Modern Prometheus" } },
  aliases: { en: [{ value: "Frankenstein" }, { value: "Frankenstein" }] },
  claims: {
    P31: [{ mainsnak: { datavalue: { value: { id: "Q7725634" } } } }],
    P407: [{ mainsnak: { datavalue: { value: { id: "Q1860" } } } }],
    P50: [{ mainsnak: { datavalue: { value: { id: "Q47152" } } } }],
    P136: [
      { mainsnak: { datavalue: { value: { id: "Q465821" } } } },
      { mainsnak: { datavalue: { value: { id: "Q24925" } } } },
    ],
    P577: [
      {
        mainsnak: {
          datavalue: { value: { time: "+1818-01-01T00:00:00Z", precision: 11 } },
        },
      },
      {
        mainsnak: {
          datavalue: { value: { time: "+1818-03-11T00:00:00Z", precision: 11 } },
        },
      },
    ],
  },
};

const linkedLabels = new Map([
  ["Q47152", "Mary Shelley"],
  ["Q465821", "Gothic fiction"],
  ["Q24925", "Horror"],
]);

describe("mapWikidataNovel", () => {
  it("maps CC0 metadata and excludes source summaries and descriptions", () => {
    expect(mapWikidataNovel(novel, linkedLabels)).toEqual({
      provider_id: "Q150827",
      title: "Frankenstein; or, The Modern Prometheus",
      original_title: null,
      synopsis: null,
      release_year: null,
      episode_count: null,
      format: "novel",
      content_rating: null,
      aliases: ["Frankenstein; or, The Modern Prometheus", "Frankenstein"],
      authors: [{ provider_id: "Q47152", name: "Mary Shelley" }],
      publication_year: 1818,
      genres: ["Gothic fiction", "Horror"],
      source_url: "https://www.wikidata.org/wiki/Q150827",
      attribution_text: expect.stringContaining("CC0"),
    });
  });

  it("rejects editions and novels missing required playable metadata", () => {
    const edition = {
      ...novel,
      claims: {
        ...novel.claims,
        P31: [{ mainsnak: { datavalue: { value: { id: "Q3331189" } } } }],
      },
    };
    expect(mapWikidataNovel(edition, linkedLabels)).toBeNull();
    expect(mapWikidataNovel({
      ...novel,
      claims: { ...novel.claims, P407: [{ mainsnak: { datavalue: { value: { id: "Q188" } } } }] },
    }, linkedLabels)).toBeNull();
    expect(mapWikidataNovel({ ...novel, claims: { ...novel.claims, P136: [] } }, linkedLabels)).toBeNull();
    expect(mapWikidataNovel({ ...novel, claims: { ...novel.claims, P50: [] } }, linkedLabels)).toBeNull();
    expect(mapWikidataNovel({ ...novel, claims: { ...novel.claims, P577: [] } }, linkedLabels)).toBeNull();
  });
});

describe("Wikidata API parsing", () => {
  it("parses and de-duplicates bounded search results", () => {
    expect(
      parseWikidataSearchIds(
        { search: [{ id: "Q150827" }, { id: "Q150827" }, { id: "not-an-id" }] },
        5,
      ),
    ).toEqual(["Q150827"]);
    expect(() => parseWikidataSearchIds({ search: [] }, 21)).toThrow(RangeError);
    expect(() => parseWikidataSearchIds(null, 5)).toThrow("unexpected search response");
  });

  it("parses entity and linked English-label results", () => {
    expect(parseWikidataEntities({ entities: { Q150827: novel } })).toEqual([novel]);
    expect(parseWikidataLabels({
      entities: { Q47152: { labels: { en: { value: "Mary Shelley" } } } },
    })).toEqual(new Map([["Q47152", "Mary Shelley"]]));
    expect(() => parseWikidataEntities({})).toThrow("unexpected entity response");
  });

  it("parses only unique Wikidata entity IDs from bounded SPARQL results", () => {
    expect(
      parseWikidataSparqlIds(
        {
          results: {
            bindings: [
              { work: { type: "uri", value: "http://www.wikidata.org/entity/Q41542" } },
              { work: { type: "uri", value: "https://www.wikidata.org/entity/Q170583" } },
              { work: { type: "uri", value: "https://www.wikidata.org/entity/Q41542" } },
              { work: { type: "uri", value: "https://example.com/Q1" } },
            ],
          },
        },
        10,
      ),
    ).toEqual(["Q41542", "Q170583"]);
    expect(() => parseWikidataSparqlIds({ results: { bindings: [] } }, 201)).toThrow(
      RangeError,
    );
    expect(() => parseWikidataSparqlIds({}, 10)).toThrow("unexpected SPARQL response");
  });

  it("collects only author and genre item identifiers for label lookup", () => {
    expect(getLinkedWikidataIds([novel])).toEqual(["Q47152", "Q465821", "Q24925"]);
  });
});

describe("parseWikidataImportOptions", () => {
  it("requires an explicit bounded search query", () => {
    expect(parseWikidataImportOptions(" Frankenstein ", undefined)).toEqual({
      query: "Frankenstein",
      limit: 10,
    });
    expect(() => parseWikidataImportOptions(undefined, undefined)).toThrow(RangeError);
    expect(() => parseWikidataImportOptions("x", undefined)).toThrow(RangeError);
    expect(() => parseWikidataImportOptions("A valid query", "21")).toThrow(RangeError);
  });
});
