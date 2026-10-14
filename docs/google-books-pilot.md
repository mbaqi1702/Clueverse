# Google Books bounded pilot

## Status — 2026-10-14

This is research only. No Google Books records were saved, and no importer, schema, schedule, or `/books` game has been built.

A bounded public-volume search for `subject:science_fiction` was attempted twice, with `maxResults=5`, `projection=lite`, and a response field mask limited to volume ID, title, authors, publication date, categories, language, and info link. Both attempts returned HTTP 429. No response records were retained. A Google Books API key was not found in the local `.env.local` under `GOOGLE_BOOKS_API_KEY`; the key's presence/value was not otherwise inspected.

The 429 does not establish whether the cause was quota, throttling, or the request environment, and it provides no evidence about catalog quality. Do not retry repeatedly or work around the limit. The official Books API documentation says public-data requests should identify the application with an API key or OAuth token and documents `maxResults` and `projection` for bounded searches.

## Recommended next steps

1. In Google Cloud Console, confirm the Books API is enabled and check project quota/error details. If proceeding, create or use an API key restricted to the Books API, keep it local in ignored `.env.local`, and never paste it into chat, commit it, or expose it to browser code.
2. After the credential/quota issue is resolved, repeat one no-write search for at most five records with the same minimal field mask. Stop on another 429 and review quota rather than retrying.
3. Review only title, author, publication date, category, language, volume ID, and link fields. Do not request or persist descriptions, snippets, cover URLs/images, or full text. Treat this as a candidate metadata sample, not permission to retain fields: verify applicable Google API terms, response cache directives, and third-party rights for each field before designing storage.
4. Manually assess edition/translation duplication and whether author/date/category facts are sufficiently complete to form fair clues. Write original puzzle synopses only after selecting books and clearing their use.
5. Keep any later import preview read-only. A Books schema migration, database write, human approval, and separate daily `/books` game each require their own reviewed scope; none is authorized by this research step.

## References

- [Google Books API usage](https://developers.google.com/books/docs/v1/using)
- [Google Books volumes API reference](https://developers.google.com/books/docs/v1/reference/volumes)
- [Google APIs Terms of Service](https://developers.google.com/terms)
- [Google Books API terms page](https://developers.google.com/books/terms)
