import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Tooltip } from "../../components/ui/Tooltip";
import { CloseIcon, PlusIcon } from "../icons";
import { MAX_COLUMNS, MIN_COLUMNS } from "./Columns";

// The grid wrapper. The visible column count is the number of children, so the
// template re-derives whenever a column is added or removed. A single quiet "+"
// affordance sits on the right edge (revealed on hover/focus) to append a
// column, capped at MAX_COLUMNS.
export function ColumnsView({ node, editor, getPos }: NodeViewProps) {
  const count = node.childCount;
  const editable = editor.isEditable;
  const canAdd = count < MAX_COLUMNS;

  const addColumn = () => {
    const pos = getPos();
    if (pos == null || !canAdd) return;
    const insertAt = pos + node.nodeSize - 1;
    editor
      .chain()
      .focus()
      .insertContentAt(insertAt, {
        type: "column",
        content: [{ type: "paragraph" }],
      })
      .run();
  };

  return (
    <NodeViewWrapper className="scribe-columns group/columns">
      <NodeViewContent
        className="scribe-columns-grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      />
      {editable && canAdd && (
        <div
          className="scribe-block-controls scribe-columns-add"
          contentEditable={false}
        >
          <Tooltip content="Add column" side="right">
            <button
              type="button"
              aria-label="Add column"
              onClick={addColumn}
              className="scribe-block-btn"
            >
              <PlusIcon size={15} />
            </button>
          </Tooltip>
        </div>
      )}
    </NodeViewWrapper>
  );
}

// A single column. Holds any blocks and exposes a quiet remove control at its
// top corner, revealed on hover/focus and only while more than MIN_COLUMNS
// remain (the layout never collapses below two columns).
export function ColumnView({ node, editor, getPos }: NodeViewProps) {
  const editable = editor.isEditable;

  const parentCount = (() => {
    const pos = getPos();
    if (pos == null) return MIN_COLUMNS;
    try {
      return editor.state.doc.resolve(pos).parent.childCount;
    } catch {
      return MIN_COLUMNS;
    }
  })();

  const removeColumn = () => {
    const pos = getPos();
    if (pos == null || parentCount <= MIN_COLUMNS) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + node.nodeSize })
      .run();
  };

  return (
    <NodeViewWrapper className="scribe-column group/column">
      {editable && parentCount > MIN_COLUMNS && (
        <div
          className="scribe-block-controls scribe-column-remove"
          contentEditable={false}
        >
          <Tooltip content="Remove column">
            <button
              type="button"
              aria-label="Remove column"
              onClick={removeColumn}
              className="scribe-block-btn"
            >
              <CloseIcon size={14} />
            </button>
          </Tooltip>
        </div>
      )}
      <NodeViewContent className="scribe-column-body" />
    </NodeViewWrapper>
  );
}
