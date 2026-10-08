# External source evaluation

Last screened: 2026-10-09. The project owner has authorized proceeding with the accepted candidates. This is a product/engineering review, not legal advice. Integrations must still honor provider-specific attribution, retention, rate-limit, and access requirements; recheck linked terms as they can change.

## Recommendation

Recommended implementation order:

- **TMDB — first adapter candidate for movies/TV.** The project owner has authorized proceeding. TMDB's API terms require attribution with its logo and a prominent notice, cap caching at six months, and require content to be purged when access ends. A separate written agreement governs commercial use. Start with one vertical (movies), preserve source IDs/provenance, avoid images, and keep the provider out of player requests.
- **Google Books — candidate for books, field-scoped.** The project owner has authorized proceeding. Google API terms restrict permanent copies of returned content unless the content owner permits it and constrain caching to the cache header. Implement only fields covered by the granted rights and terms; do not ingest descriptions or covers by default.
- **Wikidata — metadata candidate for manga, not a standalone clue source.** Wikidata structured data is CC0; attribution is encouraged. A refined but still narrow sample found useful titles and creators, but publication dates, genres, and aliases were sparse. Use it as structured metadata enrichment after further mapping and quality checks; plan for independently written or separately cleared clues.
- **AniList — do not use as an ingestion source.** Its API terms prohibit hoarding, mass collection, and using the API as a backup or data store. It is therefore incompatible with the persistent catalog design, regardless of its extensive anime/manga coverage. The published rate-limit page currently notes a temporary 30-requests-per-minute degraded limit (normally 90), which is another reason not to depend on it operationally.

The existing Tenrai catalog and review process remain separate. User authorization to proceed does not waive technical provider obligations or authorize bulk collection where the provider prohibits it.

## Wikidata exploratory query

A bounded, no-write SPARQL query selected English-labeled records with `instance of manga`, excluded manga magazines and novels, filtered volume-like descriptions/titles, and aggregated optional fields to avoid join duplicates. The first 29 returned records (alphabetically selected; not a representative or random sample) had:

- English description: 26/29
- Creator: 19/29
- Publication date: 13/29
- Genre: 9/29
- English aliases: 9/29

Some remaining results are manga volumes or short works, so the selection still needs refinement for canonical manga works/series. English descriptions were often brief classification text (for example, “Japanese manga”), not puzzle-ready synopses. This supports a limited metadata-enrichment role, not using Wikidata text as the game's clue copy. No records were saved.

## Comparison

| Candidate | Proposed vertical | Useful potential | Main constraints and risks | Current disposition |
| --- | --- | --- | --- | --- |
| TMDB | Movies first, then TV | Provider IDs, titles, metadata, broad screen-media coverage | Attribution/logo/notice required; cache limit and termination purge obligations; commercial use requires written agreement; no SLA | Start with the movie adapter; honor the owner-authorized access scope and implement attribution/retention requirements |
| Google Books API | Books | Searchable volume IDs, titles, authors, publishers, dates, categories, and links | API terms constrain persistent copying and caching; third-party content rights vary by field/record | Proceed only with fields allowed by the owner's grant and current terms; omit descriptions/covers by default |
| Wikidata | Manga works and creators | CC0 structured facts and external identifiers; titles and some creators available | Small alphabetic sample had sparse dates/genres/aliases, incomplete record classification, and little clue-quality description text | Continue bounded mapping/quality work as metadata enrichment; create clue text independently |
| AniList API | Anime and manga | Large purpose-built catalog with extensive fields | Terms expressly prohibit hoarding, mass collection, and data-storage/backup use; current temporary rate limit is reduced | Exclude from persistent catalog ingestion |

## Next bounded work

1. Run the TMDB dry run after `TMDB_API_KEY` is configured; review mapped fields and rejection counts before any `--apply`. The adapter is implemented with bounded requests, provenance, no image import, and pending-review writes. Add TMDB's required logo/notice and cache/purge handling before public use.
2. Refine the Wikidata selector to distinguish manga works/series from volumes and one-shots; continue treating the source as secondary metadata. Do not assume descriptions are puzzle clues.
3. Implement Google Books only for fields covered by the owner's permission; default to identifiers and minimal bibliographic metadata, and do not persist descriptions/covers unless expressly allowed.
4. Before any provider database write or public display, document permitted fields and uses, required attribution, retention/refresh rules, credentials, limits, and owner authorization. Keep all provider APIs out of the player request path.

## Official documentation screened

- [TMDB API FAQ](https://developer.themoviedb.org/docs/faq)
- [TMDB API Terms of Use](https://www.themoviedb.org/api-terms-of-use)
- [TMDB Logos & Attribution](https://www.themoviedb.org/about/logos-attribution)
- [Google Books API usage](https://developers.google.com/books/docs/v1/using)
- [Google APIs Terms of Service](https://developers.google.com/terms)
- [AniList API Terms of Use](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/terms-of-use)
- [AniList API rate limits](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/rate-limiting)
- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing)
- [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access)
