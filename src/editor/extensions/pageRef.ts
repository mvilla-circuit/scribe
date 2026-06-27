export type PageTargetType = "document" | "book";

// Builds the canonical internal ref stored as a page card's href (degrades to
// this link in exported HTML). Kept in its own leaf module so the node, its
// node view, and the page-picker store can share it without a circular import.
export function pageRef(targetType: PageTargetType, targetId: string): string {
  return `scribe://${targetType === "book" ? "book" : "page"}/${targetId}`;
}
