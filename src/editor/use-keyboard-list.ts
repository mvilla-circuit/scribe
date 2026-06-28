import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { nextActiveIndex } from "./list-navigation";

/** A keyboard-navigable list's active-index state and helpers. */
export interface KeyboardList {
  /** The currently highlighted index. */
  active: number;
  /** Set the highlighted index directly (e.g. on hover, or to reset to 0). */
  setActive: (index: number) => void;
  /** Attach to the scroll container; the active row is kept in view by its `data-idx`. */
  listRef: RefObject<HTMLDivElement | null>;
  /**
   * Handle an Arrow key, moving the highlight (wrapping or clamping per the
   * hook's options). Returns true when the key was an arrow it consumed, so the
   * caller can stop there and/or swallow the event.
   */
  move: (key: string) => boolean;
}

/**
 * Active-row state for a keyboard-navigable popup list (the slash menu and the
 * page-link picker). Owns the highlighted index, Arrow-key movement via
 * {@link nextActiveIndex}, and scrolling the active row (matched by its
 * `data-idx` attribute) into view. Callers keep their own reset-on-change logic
 * by calling `setActive(0)`.
 */
export function useKeyboardList(
  length: number,
  { wrap = false }: { wrap?: boolean } = {},
): KeyboardList {
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const move = useCallback(
    (key: string) => {
      if (key !== "ArrowUp" && key !== "ArrowDown") return false;
      setActive((i) => nextActiveIndex(i, key, { length, wrap }));
      return true;
    },
    [length, wrap],
  );

  return { active, setActive, listRef, move };
}
