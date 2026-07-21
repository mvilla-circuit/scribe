import type { CSSProperties } from "react";

/**
 * Inline style for reading-surface titles that consume the display-role CSS
 * vars. Shared by document/book/collection/datagrid mastheads and previews so
 * optical size, weight, line-height, and tracking stay aligned with the editor.
 */
export function displayTitleStyle(extras?: CSSProperties): CSSProperties {
  return {
    fontFamily: "var(--font-display)",
    fontSize: "var(--font-display-size)",
    fontWeight: "var(--font-display-regular)",
    lineHeight: "var(--font-display-line)",
    letterSpacing: "var(--font-display-spacing)",
    ...extras,
  };
}
