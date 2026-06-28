import type { MouseEvent } from "react";

/**
 * Mousedown handler for editor toolbar and menu controls: cancels the default
 * so clicking the control never moves or clears the editor's text selection —
 * keeping the floating bars (which only show over a selection) pinned in place.
 */
export function preserveSelection(e: MouseEvent): void {
  e.preventDefault();
}
