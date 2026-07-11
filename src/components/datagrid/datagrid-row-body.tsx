import { EditorBridgeHost } from "@/components/book/editor-bridge-host";
import { SkeletonText } from "@/components/ui/skeleton";
import {
  useDatagridRowContent,
  useUpdateDatagridRowContent,
} from "@/data/datagrid-rows";
import { Editor } from "@/editor/lazy-editor";
import type { SaveState } from "@/editor/use-autosave";

/**
 * The rich-text body of a datagrid row. The TipTap editor is mounted only here
 * — i.e. only while a row is open — and is keyed by row id so switching rows
 * remounts it and flushes any pending autosave. Loading and saving mirror the
 * document/entry autosave pattern; the autosave hook guards its async writes
 * against unmount.
 */
export function DatagridRowBody({
  rowId,
  onSaveStateChange,
}: {
  rowId: string;
  onSaveStateChange?: (state: SaveState) => void;
}) {
  const contentQuery = useDatagridRowContent(rowId);
  const updateContent = useUpdateDatagridRowContent();

  if (!contentQuery.isSuccess) {
    return (
      <div className="flex flex-col gap-6" aria-hidden>
        <SkeletonText lines={3} lineHeight="0.85rem" />
        <SkeletonText lines={4} lineHeight="0.85rem" />
      </div>
    );
  }

  return (
    <EditorBridgeHost>
      <Editor
        key={rowId}
        documentId={rowId}
        initialContent={contentQuery.data}
        editable
        onPersist={(content) =>
          updateContent.mutateAsync({ id: rowId, content })
        }
        onSaveStateChange={onSaveStateChange}
      />
    </EditorBridgeHost>
  );
}
