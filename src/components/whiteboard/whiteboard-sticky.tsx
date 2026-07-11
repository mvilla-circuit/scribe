import type { WhiteboardStickyItem } from "@/lib/whiteboard-scene";

import { stickyColorVar } from "./whiteboard-colors";
import { CanvasText } from "./whiteboard-editable";

interface WhiteboardStickyProps {
  item: WhiteboardStickyItem;
  editing: boolean;
  onCommit: (text: string) => void;
  onStopEditing: () => void;
}

/** A compact colored note: a filled pastel card with multiline editable text. */
export function WhiteboardSticky({
  item,
  editing,
  onCommit,
  onStopEditing,
}: WhiteboardStickyProps) {
  return (
    <div
      className="flex h-full w-full flex-col rounded-md p-3 text-sm leading-snug"
      style={{
        backgroundColor: stickyColorVar(item.color),
        color: "var(--sticky-text)",
      }}
    >
      <CanvasText
        value={item.text}
        editing={editing}
        onCommit={onCommit}
        onStopEditing={onStopEditing}
        ariaLabel="Sticky note text"
        placeholder="Note"
      />
    </div>
  );
}
