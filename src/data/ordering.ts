// Fractional indexing for the `position numeric` columns. Instead of rewriting
// every sibling's position on reorder, we pick a value strictly between the two
// neighbours, so a single row update persists a move.
//
// `prev` is the position of the item that will sit *before* the moved item and
// `next` the one *after*. Either may be undefined at the list edges.

const STEP = 1024;

/**
 * Thrown when two neighbours sit so close together that float64 can no longer
 * represent a value strictly between them — i.e. the gap has shrunk below one
 * ULP after many reorders into the same slot. Callers should re-space the
 * affected siblings rather than persist a colliding position.
 */
export class PositionExhaustedError extends Error {
  constructor() {
    super("Fractional position precision exhausted; rebalance required.");
    this.name = "PositionExhaustedError";
  }
}

/**
 * Picks a fractional position strictly between two neighbours so a reorder
 * persists as a single row update. Either bound may be undefined at a list edge.
 *
 * Throws {@link PositionExhaustedError} when the neighbours are adjacent floats
 * and no value fits between them, so the rare precision-exhaustion case surfaces
 * to the caller instead of silently colliding.
 */
export function getPositionBetween(prev?: number, next?: number): number {
  if (prev === undefined) {
    if (next === undefined) return STEP;
    return next - STEP;
  }
  if (next === undefined) return prev + STEP;
  // `prev + (next - prev) / 2` (not `(prev + next) / 2`) avoids overflow for
  // large positions and lands on the same midpoint; the guard then catches the
  // case where rounding pins the result to a neighbour.
  const mid = prev + (next - prev) / 2;
  if (mid <= prev || mid >= next) throw new PositionExhaustedError();
  return mid;
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
