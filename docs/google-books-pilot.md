# Google Books bounded pilot

## Status — 2026-10-16

No Google Books records were saved. A separate Wikidata novel metadata importer and staging migration are implemented on a feature branch but have not been merged, applied, or used for catalog writes. A `/books` game path is implemented with a fictional sample puzzle; there is no database-backed book schedule yet.

A bounded public-volume search for `subject:science_fiction` was attempted twice, with `maxResults=5`, `projection=lite`, and a response field mask limited to volume ID, title, authors, publication date, categories, language, and info link. Both attempts returned HTTP 429. No response records were retained. A Google Books API key was not found in the local `.env.local` under `GOOGLE_BOOKS_API_KEY`; the key's presence/value was not otherwise inspected.

On 2026-10-16, one more bounded request confirmed that the configured Google Cloud project's Books API daily query quota is set to zero. No API key is configured locally. Do not retry until the project owner enables the API and confirms a positive quota; do not try another credential or project to work around this limit.

As a no-write alternative check, a single Gutendex search for English-language "Frankenstein" returned five records, including duplicate editions and a sound recording. The response included automatically generated summaries and links to book files; none were retained or used as puzzle text. Gutendex's documentation recommends running a self-hosted instance for long-term use. Project Gutenberg warns non-US users to check local copyright status and says its main site is intended for human users, pointing automated catalog users to offline catalogs and mirrors instead. This small sample is not representative and does not establish metadata reuse rights or suitability for an integration.

**Disposition:** Google Books remains the preferred API candidate, blocked on project quota. Gutendex is not approved as a ClueVerse source. A metadata-only Wikidata novel importer is implemented on a separate feature branch as a CC0 structured-data pilot; it does not import descriptions, summaries, or book text. The Google Books documentation supports API keys or OAuth for public-data requests and documents `maxResults` and `projection` for bounded searches.

The first no-write Wikidata importer run searched ten English-language candidate items for "Frankenstein": one mapped novel and nine rejected candidates. The mapped item was Wikidata Q150827 (*Frankenstein; or, The Modern Prometheus*), with publication year 1818, one author, and six genres. The preview was not written to the database. Although the Wikidata search API includes descriptions in its search response, the importer ignores and does not retain them; no summaries or book text were requested or retained.

## Recommended next steps

1. For the current Wikidata pilot, review the no-write preview, check field mappings and novel/edition classification, and apply the new storage migration only after review. Any import batch still needs its own explicit approval; imported rows remain pending review.
2. The project owner must enable the Google Books API and confirm a positive daily quota before any further request. If proceeding, create or use an API key restricted to the Books API, keep it local in ignored `.env.local`, and never paste it into chat, commit it, or expose it to browser code.
3. Only after quota is enabled, repeat one no-write Google Books search for at most five records with the same minimal field mask. Stop on another 429 and review quota rather than retrying.
4. Review only title, author, publication date, category, language, volume ID, and link fields. Do not request or persist descriptions, snippets, cover URLs/images, or full text. Treat this as a candidate metadata sample, not permission to retain fields: verify applicable Google API terms, response cache directives, and third-party rights for each field before designing storage.
5. For Gutendex, first review its API/data terms, self-hosting requirements, Project Gutenberg's offline-catalog guidance, and territory-specific copyright status. Do not use its generated summaries or download links as ClueVerse clue content.
6. Manually assess edition/translation duplication and whether cleared author/date/category facts are sufficiently complete to form fair clues. Write original puzzle synopses only after selecting books and clearing their use.
7. Keep any later import preview read-only. A Books daily schedule/game and title approval require separate reviewed scope; the metadata importer does not authorize either.

## References

- [Google Books API usage](https://developers.google.com/books/docs/v1/using)
- [Google Books volumes API reference](https://developers.google.com/books/docs/v1/reference/volumes)
- [Google APIs Terms of Service](https://developers.google.com/terms)
- [Google Books API terms page](https://developers.google.com/books/terms)
- [Gutendex API documentation](https://gutendex.com/)
- [Project Gutenberg terms of use](https://www.gutenberg.org/policy/terms_of_use.html)
- [Project Gutenberg offline catalogs and feeds](https://www.gutenberg.org/ebooks/offline_catalogs.html)
