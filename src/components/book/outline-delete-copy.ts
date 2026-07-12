/**
 * Cascade-aware delete confirm copy for outline document/whiteboard rows.
 */
export function describeDelete(
  target: {
    kind: "document" | "whiteboard";
    descendants?: number;
    whiteboardDescendants?: number;
  } | null,
): string {
  if (target?.kind === "whiteboard") {
    return "This permanently deletes the whiteboard.";
  }
  const pages = target?.descendants ?? 0;
  const boards = target?.whiteboardDescendants ?? 0;
  if (pages === 0 && boards === 0) {
    return "This permanently deletes the page.";
  }
  const parts: string[] = [];
  if (pages > 0) {
    parts.push(`${pages} nested page${pages === 1 ? "" : "s"}`);
  }
  if (boards > 0) {
    parts.push(`${boards} whiteboard${boards === 1 ? "" : "s"}`);
  }
  return `This permanently deletes the page and its ${parts.join(" and ")}.`;
}
