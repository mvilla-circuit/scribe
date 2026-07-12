/**
 * Shared confirm-dialog copy for gallery/sidebar leaf deletes
 * (doc, datagrid, whiteboard). Folder/collection/book wording stays local.
 */

export type LeafDeleteKind = "entry" | "datagrid" | "whiteboard";

/** Title for a leaf delete confirm: `Delete "…"`. */
export function leafDeleteTitle(title: string): string {
  return `Delete "${title}"?`;
}

/** Cascade-aware description for a leaf delete confirm. */
export function leafDeleteDescription(kind: LeafDeleteKind): string {
  if (kind === "entry") return "This permanently deletes the doc.";
  if (kind === "datagrid") {
    return "This permanently deletes the datagrid and all its rows.";
  }
  return "This permanently deletes the whiteboard.";
}
