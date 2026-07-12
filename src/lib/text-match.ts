/**
 * Locale-aware substring match for live search/filter inputs: trims the
 * query and compares with `toLocaleLowerCase()` so accented/cased input
 * matches consistently. A blank or whitespace-only query matches everything,
 * which is the expected "no filter applied yet" behavior for search boxes.
 */
export function matchesNormalizedQuery(
  haystack: string,
  query: string,
): boolean {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;
  return haystack
    .toLocaleLowerCase()
    .includes(trimmedQuery.toLocaleLowerCase());
}
