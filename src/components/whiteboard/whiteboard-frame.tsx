import type { WhiteboardFrameItem } from "@/lib/whiteboard-scene";

import { CanvasText } from "./whiteboard-editable";

interface WhiteboardFrameProps {
  item: WhiteboardFrameItem;
  editing: boolean;
  onCommit: (title: string) => void;
  onStopEditing: () => void;
}

/**
 * A titled region for organizing the surface. It's a hairline-framed area with
 * a quiet caption; it sits behind other items (lower z) and never owns them.
 */
export function WhiteboardFrame({
  item,
  editing,
  onCommit,
  onStopEditing,
}: WhiteboardFrameProps) {
  return (
    <div className="flex h-full w-full flex-col rounded-lg border border-border bg-surface/40">
      <div className="px-2 pt-1.5 text-xs font-medium text-muted">
        <CanvasText
          value={item.title}
          editing={editing}
          onCommit={onCommit}
          onStopEditing={onStopEditing}
          ariaLabel="Frame title"
          placeholder="Frame"
        />
      </div>
      <div className="flex-1" />
    </div>
  );
}
