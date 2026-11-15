export const MAX_TITLE_SUGGESTIONS = 8;
export const TITLE_SUGGESTION_CANDIDATE_LIMIT = 64;

export function rankTitleSuggestions(
  rows: readonly { id: string; title: string }[],
  activeAnswerId: string,
  query: string,
): string[] {
  const normalizedQuery = query.toLowerCase();
  const seenTitles = new Set<string>();

  return rows
    .filter((row) => row.id !== activeAnswerId)
    .sort((left, right) => {
      const leftStartsWithQuery = left.title.toLowerCase().startsWith(normalizedQuery);
      const rightStartsWithQuery = right.title.toLowerCase().startsWith(normalizedQuery);
      if (leftStartsWithQuery !== rightStartsWithQuery) {
        return leftStartsWithQuery ? -1 : 1;
      }
      return left.title.localeCompare(right.title);
    })
    .filter((row) => {
      const normalizedTitle = row.title.toLowerCase();
      if (seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    })
    .slice(0, MAX_TITLE_SUGGESTIONS)
    .map((row) => row.title);
}
