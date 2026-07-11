import type { StickyColor } from "@/lib/whiteboard-scene";

/**
 * Named sticky colors in the order the color picker offers them. Kept as a
 * literal tuple so the palette UI and the scene's {@link StickyColor} union stay
 * in lock-step.
 */
export const STICKY_COLOR_ORDER: readonly StickyColor[] = [
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
];

/**
 * Resolves a sticky color to the theme CSS variable that carries its light/dark
 * pair, so a sticky retints with the active theme instead of hardcoding a hex.
 */
export function stickyColorVar(color: StickyColor): string {
  return `var(--sticky-${color})`;
}
