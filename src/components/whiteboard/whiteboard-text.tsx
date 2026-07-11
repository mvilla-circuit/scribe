import type { WhiteboardTextItem } from "@/lib/whiteboard-scene";

import { CanvasText } from "./whiteboard-editable";

interface WhiteboardTextProps {
  item: WhiteboardTextItem;
  editing: boolean;
  onCommit: (text: string) => void;
  onStopEditing: () => void;
}

/** A quiet, chrome-less text block that floats directly on the canvas. */
export function WhiteboardText({
  item,
  editing,
  onCommit,
  onStopEditing,
}: WhiteboardTextProps) {
  return (
    <div className="flex h-full w-full flex-col p-1 text-sm leading-snug text-text">
      <CanvasText
        value={item.text}
        editing={editing}
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Text block"
        placeholder="Text"
      />
    </div>
  );
}
