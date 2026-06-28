// Fractional indexing for the `position numeric` columns. Instead of rewriting
// every sibling's position on reorder, we pick a value strictly between the two
// neighbours, so a single row update persists a move.
//
// `prev` is the position of the item that will sit *before* the moved item and
// `next` the one *after*. Either may be undefined at the list edges.

const STEP = 1024;

/**
 * Picks a fractional position strictly between two neighbours so a reorder
 * persists as a single row update. Either bound may be undefined at a list edge.
 */
export function getPositionBetween(prev?: number, next?: number): number {
  if (prev === undefined) {
    if (next === undefined) return STEP;
    return next - STEP;
  }
  if (next === undefined) return prev + STEP;
  return (prev + next) / 2;
}

/**
 * The position for a new item appended after `siblings`. Takes the largest
 * existing position (so order of the input doesn't matter) and steps past it;
 * an empty list yields the first slot. Centralizes the "add to the end of this
 * container" policy shared by every create flow.
 */
export function endPositionFor(siblings: { position: number }[]): number {
  let max: number | undefined;
  for (const s of siblings) {
    if (max === undefined || s.position > max) max = s.position;
  }
  return getPositionBetween(max, undefined);
}

/** Sort comparator by position then created_at as a stable tiebreaker. */
export function byPosition<T extends { position: number; created_at: string }>(
  a: T,
  b: T,
): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
}
