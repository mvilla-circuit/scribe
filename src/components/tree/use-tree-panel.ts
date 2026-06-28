import { useCallback, useState } from "react";

// The transient UI state both tree panels (the Library tree and the in-book
// Outline) maintain: which row is being inline-renamed, and which item has a
// pending delete confirmation. The delete target is generic so each panel can
// carry the details its confirm dialog needs.
export interface TreePanel<TTarget> {
  /** Id of the row currently being inline-renamed, or null. */
  editingId: string | null;
  startRename: (id: string) => void;
  cancelRename: () => void;
  /** The item awaiting delete confirmation, or null. */
  deleteTarget: TTarget | null;
  requestDelete: (target: TTarget) => void;
  clearDelete: () => void;
}

export function useTreePanel<TTarget>(): TreePanel<TTarget> {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TTarget | null>(null);

  const startRename = useCallback((id: string) => {
    setEditingId(id);
  }, []);
  const cancelRename = useCallback(() => {
    setEditingId(null);
  }, []);
  const requestDelete = useCallback((target: TTarget) => {
    setDeleteTarget(target);
  }, []);
  const clearDelete = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  return {
    editingId,
    startRename,
    cancelRename,
    deleteTarget,
    requestDelete,
    clearDelete,
  };
}
