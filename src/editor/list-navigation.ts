interface ListNavOptions {
  /** Number of items in the list. */
  length: number;
  /**
   * Wrap around the ends instead of clamping. The slash menu wraps (a circular
   * popup); the page picker clamps (a scrollable search list).
   */
  wrap?: boolean;
}

/**
 * Compute the next highlighted index for an Arrow key over a list, shared by
 * the slash menu and the page-link picker so their keyboard navigation stays
 * consistent (and the wrap-vs-clamp choice is explicit). Returns the current
 * index unchanged for an empty list or any non-arrow key.
 */
export function nextActiveIndex(
  current: number,
  key: string,
  { length, wrap = false }: ListNavOptions,
): number {
  if (length === 0) return current;
  if (key === "ArrowDown") {
    return wrap ? (current + 1) % length : Math.min(length - 1, current + 1);
  }
  if (key === "ArrowUp") {
    return wrap ? (current + length - 1) % length : Math.max(0, current - 1);
  }
  return current;
}
