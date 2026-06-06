// Fractional indexing for the `position numeric` columns. Instead of rewriting
// every sibling's position on reorder, we pick a value strictly between the two
// neighbours, so a single row update persists a move.
//
// `prev` is the position of the item that will sit *before* the moved item and
// `next` the one *after*. Either may be undefined at the list edges.

const STEP = 1024;

export function getPositionBetween(prev?: number, next?: number): number {
  if (prev === undefined && next === undefined) return STEP;
  if (prev === undefined) return (next as number) - STEP;
  if (next === undefined) return prev + STEP;
  return (prev + next) / 2;
}

// Sort comparator by position then created_at as a stable tiebreaker.
export function byPosition<T extends { position: number; created_at: string }>(
  a: T,
  b: T
): number {
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at.localeCompare(b.created_at);
}
