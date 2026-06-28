import type { Editor } from "@tiptap/react";

import { normalizeHref } from "./normalize-href";

/** A ProseMirror document range (inclusive `from`, exclusive `to`). */
export interface LinkRange {
  from: number;
  to: number;
}

/** Applies (or updates) the link mark with `href` across the given range,
 * normalizing a scheme-less domain first. An empty/whitespace href removes the
 * link instead. */
export function setLinkHref(
  editor: Editor,
  range: LinkRange,
  rawHref: string,
): void {
  const href = normalizeHref(rawHref);
  if (!href) {
    clearLink(editor, range);
    return;
  }
  editor
    .chain()
    .focus()
    .setTextSelection(range)
    .extendMarkRange("link")
    .setLink({ href })
    .run();
}

/** Removes the link mark across the given range, leaving the text intact. */
export function clearLink(editor: Editor, range: LinkRange): void {
  editor
    .chain()
    .focus()
    .setTextSelection(range)
    .extendMarkRange("link")
    .unsetLink()
    .run();
}
