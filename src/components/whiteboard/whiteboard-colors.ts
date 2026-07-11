import { STICKY_COLOR_ORDER, type StickyColor } from "@/lib/whiteboard-scene";

export { STICKY_COLOR_ORDER };

/**
 * Resolves a sticky color to the theme CSS variable that carries its light/dark
 * pair, so a sticky retints with the active theme instead of hardcoding a hex.
 */
export function stickyColorVar(color: StickyColor): string {
  return `var(--sticky-${color})`;
}
