export type WikidataBookCuration = {
  providerId: string;
  title: string;
  synopsis: string;
};

export const wikidataBookCurationBatch: WikidataBookCuration[] = [
  {
    providerId: "Q45735",
    title: "Charlotte's Web",
    synopsis:
      "A young farm girl befriends a runt pig and persuades her family to spare him. In the barn, an observant spider spins messages above his pen, drawing visitors and changing the animal's fate.",
  },
  {
    providerId: "Q181488",
    title: "Gulliver's Travels",
    synopsis:
      "A ship's surgeon survives a series of voyages to unfamiliar societies, from a land of tiny inhabitants to one ruled by giants. Each encounter turns travel adventure into a sharp examination of power, custom, and human pride.",
  },
  {
    providerId: "Q164974",
    title: "Oliver Twist",
    synopsis:
      "An orphan raised in harsh institutions escapes to the capital, where he falls among a gang that survives by theft. His search for safety and belonging brings him into contact with both callous exploiters and people willing to help.",
  },
  {
    providerId: "Q74287",
    title: "The Hobbit",
    synopsis:
      "A comfort-loving homebody is swept into a company of dwarves seeking to reclaim their mountain kingdom and its lost treasure. Their journey crosses dangerous lands, tests his resourcefulness, and leads to a fateful encounter with a dragon.",
  },
  {
    providerId: "Q45192",
    title: "The Hound of the Baskervilles",
    synopsis:
      "A consulting detective and his companion investigate a family's ancestral curse after a nobleman dies under mysterious circumstances. The trail leads to a remote moor, where a threatened heir and a legendary beast may be connected.",
  },
  {
    providerId: "Q11678",
    title: "The Hunger Games",
    synopsis:
      "In a nation rebuilt after civil war, a teenager volunteers for a televised contest where young representatives must fight until only one remains. Her defiance and alliances challenge the spectacle's control over the districts.",
  },
  {
    providerId: "Q15228",
    title: "The Lord of the Rings",
    synopsis:
      "A quiet young hobbit inherits a ring whose survival threatens every free people of Middle-earth. With companions from several realms, he must carry it into enemy territory while war gathers around the quest.",
  },
  {
    providerId: "Q149993",
    title: "The Phantom Tollbooth",
    synopsis:
      "A bored boy finds a mysterious tollbooth in his room and drives into a kingdom where words and numbers shape reality. With unusual companions, he sets out to reunite estranged rulers and restore curiosity to the land.",
  },
  {
    providerId: "Q82464",
    title: "The Picture of Dorian Gray",
    synopsis:
      "A beautiful young man wishes that a portrait would age in his place, leaving his appearance untouched by time. As he pursues pleasure and influence, the hidden image records the moral cost of his choices.",
  },
  {
    providerId: "Q152267",
    title: "White Fang",
    synopsis:
      "A wolf-dog grows up in the harsh northern wilderness, learning fear and violence from both animals and people. After passing through several owners, he encounters kindness and must adapt to a very different life.",
  },
];

export function validateWikidataBookCurationBatch(
  batch: readonly WikidataBookCuration[],
): void {
  const providerIds = new Set<string>();

  for (const book of batch) {
    if (!/^Q[1-9]\d*$/.test(book.providerId)) {
      throw new Error(`Invalid Wikidata provider ID: ${book.providerId}`);
    }
    if (providerIds.has(book.providerId)) {
      throw new Error(`Duplicate Wikidata provider ID: ${book.providerId}`);
    }
    providerIds.add(book.providerId);

    if (!book.title.trim() || book.synopsis.trim().length < 80) {
      throw new Error(`Book curation is incomplete for ${book.providerId}.`);
    }
    if (book.synopsis.toLocaleLowerCase().includes(book.title.toLocaleLowerCase())) {
      throw new Error(`Synopsis includes its answer title for ${book.providerId}.`);
    }
  }
}
