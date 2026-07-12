import type { QueryClient } from "@tanstack/react-query";

import { whiteboardSceneKey, whiteboardsKey } from "./query-keys";
import type { WhiteboardMeta } from "./whiteboards";

/**
 * Removes cascade-deleted whiteboards and their independently cached scenes.
 * Returns the removed ids so callers can use the same predicate for follow-up
 * selection cleanup when needed.
 */
export function pruneWhiteboardCache(
  qc: QueryClient,
  shouldRemove: (whiteboard: WhiteboardMeta) => boolean,
): string[] {
  const whiteboards = qc.getQueryData<WhiteboardMeta[]>(whiteboardsKey) ?? [];
  const removedIds = whiteboards
    .filter(shouldRemove)
    .map((whiteboard) => whiteboard.id);
  if (removedIds.length === 0) return removedIds;

  const removed = new Set(removedIds);
  qc.setQueryData<WhiteboardMeta[]>(whiteboardsKey, (current) =>
    (current ?? []).filter((whiteboard) => !removed.has(whiteboard.id)),
  );
  for (const id of removedIds) {
    qc.removeQueries({ queryKey: whiteboardSceneKey(id) });
  }
  return removedIds;
}
