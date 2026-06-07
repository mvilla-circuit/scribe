import { useEffect, useRef, type ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
} from "@floating-ui/dom";
import { Tooltip } from "../../components/ui/Tooltip";
import { CloseIcon, PlusIcon, TrashIcon } from "../icons";

// Inline-on-focus table controls. Rather than a persistent toolbar, a compact
// control cluster floats just above the table the caret is in (and only then),
// driven by the built-in table commands. It anchors to the table's DOM via
// Floating UI's autoUpdate, so it tracks scroll, resize, and column drags.
export function TableControls({ editor }: { editor: Editor }) {
  const { tablePos } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const { $from } = e.state.selection;
      let pos = -1;
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === "table") {
          pos = $from.before(d);
          break;
        }
      }
      return { tablePos: pos };
    },
  });

  const floatingRef = useRef<HTMLDivElement>(null);
  const visible = editor.isEditable && tablePos >= 0;

  useEffect(() => {
    const floating = floatingRef.current;
    if (!visible || !floating) return;
    const dom = editor.view.nodeDOM(tablePos);
    const reference =
      dom instanceof HTMLElement
        ? (dom.querySelector("table") ?? dom)
        : null;
    if (!reference) return;
    const update = () => {
      computePosition(reference, floating, {
        strategy: "fixed",
        placement: "top-end",
        middleware: [offset(6), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        floating.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      });
    };
    const cleanup = autoUpdate(reference, floating, update);
    return cleanup;
  }, [editor, tablePos, visible]);

  const chain = () => editor.chain().focus();

  return (
    <div
      ref={floatingRef}
      className="scribe-table-controls"
      data-visible={visible || undefined}
      role="toolbar"
      aria-label="Table controls"
      // Keep the selection while clicking a control.
      onMouseDown={(e) => e.preventDefault()}
    >
      <CtrlButton label="Add row below" onClick={() => chain().addRowAfter().run()}>
        <span className="scribe-table-ctrl-glyph">
          <PlusIcon size={13} />
          Row
        </span>
      </CtrlButton>
      <CtrlButton label="Delete row" onClick={() => chain().deleteRow().run()}>
        <span className="scribe-table-ctrl-glyph">
          <CloseIcon size={13} />
          Row
        </span>
      </CtrlButton>
      <Divider />
      <CtrlButton
        label="Add column after"
        onClick={() => chain().addColumnAfter().run()}
      >
        <span className="scribe-table-ctrl-glyph">
          <PlusIcon size={13} />
          Col
        </span>
      </CtrlButton>
      <CtrlButton
        label="Delete column"
        onClick={() => chain().deleteColumn().run()}
      >
        <span className="scribe-table-ctrl-glyph">
          <CloseIcon size={13} />
          Col
        </span>
      </CtrlButton>
      <Divider />
      <CtrlButton label="Delete table" onClick={() => chain().deleteTable().run()}>
        <TrashIcon size={14} />
      </CtrlButton>
    </div>
  );
}

function CtrlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        className="scribe-table-ctrl-btn"
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Divider() {
  return <span className="scribe-table-ctrl-divider" />;
}
