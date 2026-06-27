import {
  NodeViewContent,
  type NodeViewProps,
  NodeViewWrapper,
} from "@tiptap/react";

import { Tooltip } from "../../components/ui/Tooltip";
import { CloseIcon } from "../icons";
import { MIN_COLUMNS } from "./columnsConstants";

// The grid wrapper. The visible column count is the number of children, so the
// template re-derives whenever a column is added or removed. The count itself is
// changed from the block handle menu (see BlockHandle), so there is no inline
// add affordance here.
export function ColumnsView({ node }: NodeViewProps) {
  const count = node.childCount;

  return (
    <NodeViewWrapper className="scribe-columns group/columns">
      <NodeViewContent
        className="scribe-columns-grid"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
      />
    </NodeViewWrapper>
  );
}

// A single column. Holds any blocks and exposes a quiet remove control at its
// top corner, revealed on hover/focus and only while more than MIN_COLUMNS
// remain (the layout never collapses below two columns).
export function ColumnView({ node, editor, getPos }: NodeViewProps) {
  const editable = editor.isEditable;

  // A pristine column holds a single empty paragraph. Surface a quiet hint so an
  // empty column reads as a real, fillable region rather than blank space.
  const isEmpty =
    node.childCount === 1 &&
    node.firstChild?.type.name === "paragraph" &&
    node.firstChild.content.size === 0;

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
      {editable && isEmpty && (
        <div className="scribe-column-placeholder" contentEditable={false}>
          Empty column
        </div>
      )}
      <NodeViewContent className="scribe-column-body" />
    </NodeViewWrapper>
  );
}
