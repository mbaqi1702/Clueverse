# Google Books bounded pilot

## Status — 2026-10-16

This is research only. No Google Books records were saved, and no importer, schema, schedule, or `/books` game has been built.

A bounded public-volume search for `subject:science_fiction` was attempted twice, with `maxResults=5`, `projection=lite`, and a response field mask limited to volume ID, title, authors, publication date, categories, language, and info link. Both attempts returned HTTP 429. No response records were retained. A Google Books API key was not found in the local `.env.local` under `GOOGLE_BOOKS_API_KEY`; the key's presence/value was not otherwise inspected.

On 2026-10-16, one more bounded request confirmed that the configured Google Cloud project's Books API daily query quota is set to zero. No API key is configured locally. Do not retry until the project owner enables the API and confirms a positive quota; do not try another credential or project to work around this limit.

As a no-write alternative check, a single Gutendex search for English-language "Frankenstein" returned five records, including duplicate editions and a sound recording. The response included automatically generated summaries and links to book files; none were retained or used as puzzle text. Gutendex's documentation recommends running a self-hosted instance for long-term use. Project Gutenberg warns non-US users to check local copyright status and says its main site is intended for human users, pointing automated catalog users to offline catalogs and mirrors instead. This small sample is not representative and does not establish metadata reuse rights or suitability for an integration.

**Disposition:** Google Books remains the authorized candidate source, blocked on project quota; Gutendex is an unapproved research alternative only. No Books data source is integrated into ClueVerse yet. The Google Books documentation supports API keys or OAuth for public-data requests and documents `maxResults` and `projection` for bounded searches.

## Recommended next steps

1. The project owner must enable the Google Books API and confirm a positive daily quota. If proceeding, create or use an API key restricted to the Books API, keep it local in ignored `.env.local`, and never paste it into chat, commit it, or expose it to browser code.
2. Only after quota is enabled, repeat one no-write search for at most five records with the same minimal field mask. Stop on another 429 and review quota rather than retrying.
3. Review only title, author, publication date, category, language, volume ID, and link fields. Do not request or persist descriptions, snippets, cover URLs/images, or full text. Treat this as a candidate metadata sample, not permission to retain fields: verify applicable Google API terms, response cache directives, and third-party rights for each field before designing storage.
4. For Gutendex, first review its API/data terms, self-hosting requirements, Project Gutenberg's offline-catalog guidance, and territory-specific copyright status. Do not use its generated summaries or download links as ClueVerse clue content.
5. Manually assess edition/translation duplication and whether cleared author/date/category facts are sufficiently complete to form fair clues. Write original puzzle synopses only after selecting books and clearing their use.
6. Keep any later import preview read-only. A Books schema migration, database write, human approval, and separate daily `/books` game each require their own reviewed scope; none is authorized by this research step.

## References

- [Google Books API usage](https://developers.google.com/books/docs/v1/using)
- [Google Books volumes API reference](https://developers.google.com/books/docs/v1/reference/volumes)
- [Google APIs Terms of Service](https://developers.google.com/terms)
- [Google Books API terms page](https://developers.google.com/books/terms)
- [Gutendex API documentation](https://gutendex.com/)
- [Project Gutenberg terms of use](https://www.gutenberg.org/policy/terms_of_use.html)
- [Project Gutenberg offline catalogs and feeds](https://www.gutenberg.org/ebooks/offline_catalogs.html)
