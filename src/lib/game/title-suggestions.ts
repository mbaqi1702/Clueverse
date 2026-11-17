export const MAX_TITLE_SUGGESTIONS = 8;
export const TITLE_SUGGESTION_CANDIDATE_LIMIT = 64;

type TitleSuggestionCandidate = {
  id: string;
  title: string;
  original_title?: string | null;
  media_aliases?: readonly { alias: string }[] | null;
};

export function rankTitleSuggestions(
  rows: readonly TitleSuggestionCandidate[],
  activeAnswerId: string,
  query: string,
): string[] {
  const normalizedQuery = query.toLowerCase();
  const candidates = new Map<
    string,
    { title: string; matchingTitles: Set<string> }
  >();

  for (const row of rows) {
    if (row.id === activeAnswerId) continue;

    const candidate = candidates.get(row.id) ?? {
      title: row.title,
      matchingTitles: new Set<string>(),
    };
    candidate.matchingTitles.add(row.title);
    if (row.original_title) candidate.matchingTitles.add(row.original_title);
    for (const item of row.media_aliases ?? []) {
      candidate.matchingTitles.add(item.alias);
    }
    candidates.set(row.id, candidate);
  }

  const seenTitles = new Set<string>();
  return [...candidates.values()]
    .sort((left, right) => {
      const getMatchRank = (candidate: typeof left) => {
        if (candidate.title.toLowerCase().startsWith(normalizedQuery)) {
          return 0;
        }
        if (
          [...candidate.matchingTitles].some(
            (title) =>
              title.toLowerCase() !== candidate.title.toLowerCase() &&
              title.toLowerCase().startsWith(normalizedQuery),
          )
        ) {
          return 1;
        }
        return 2;
      };
      const rankDifference = getMatchRank(left) - getMatchRank(right);
      if (rankDifference !== 0) {
        return rankDifference;
      }
      return left.title.localeCompare(right.title);
    })
    .filter((candidate) => {
      const normalizedTitle = candidate.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    })
    .slice(0, MAX_TITLE_SUGGESTIONS)
    .map((candidate) => candidate.title);
}
