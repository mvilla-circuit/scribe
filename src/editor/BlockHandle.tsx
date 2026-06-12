import { useCallback, useMemo, useRef, useState } from "react";
import type { ChainedCommands, Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { offset } from "@floating-ui/dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../components/ui/DropdownMenu";
import {
  BulletListIcon,
  CodeBlockIcon,
  CopyIcon,
  DragHandleIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  OrderedListIcon,
  QuoteIcon,
  TaskListIcon,
  TextIcon,
  TrashIcon,
} from "./icons";
import type { IconProps } from "../lib/makeIcon";

// A single block target: the ProseMirror node currently under the gutter handle
// and the absolute position right before it.
type Target = { node: PMNode; pos: number };

// "Turn into" conversions. Each applies to the textblock the handle points at,
// mirroring the slash-menu commands so block typing stays consistent.
type TurnInto = {
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  apply: (chain: ChainedCommands) => ChainedCommands;
};

const TURN_INTO: TurnInto[] = [
  { label: "Text", icon: TextIcon, apply: (c) => c.setParagraph() },
  { label: "Heading 1", icon: Heading1Icon, apply: (c) => c.setNode("heading", { level: 1 }) },
  { label: "Heading 2", icon: Heading2Icon, apply: (c) => c.setNode("heading", { level: 2 }) },
  { label: "Heading 3", icon: Heading3Icon, apply: (c) => c.setNode("heading", { level: 3 }) },
  { label: "Bulleted list", icon: BulletListIcon, apply: (c) => c.toggleBulletList() },
  { label: "Numbered list", icon: OrderedListIcon, apply: (c) => c.toggleOrderedList() },
  { label: "To-do list", icon: TaskListIcon, apply: (c) => c.toggleTaskList() },
  { label: "Quote", icon: QuoteIcon, apply: (c) => c.wrapIn("quote") },
  { label: "Code", icon: CodeBlockIcon, apply: (c) => c.toggleCodeBlock() },
];

// Notion-style gutter control. The handle fades in next to the hovered top-level
// block: drag it to reorder (handled natively by the drag-handle plugin), or
// click it to open a menu of block actions (Duplicate, Delete, Turn into).
//
// The drag affordance and the click-to-menu affordance share one surface. To
// avoid the Radix trigger's pointerdown from hijacking native HTML5 drag, the
// dropdown is fully controlled and anchored to a hidden element; the visible
// button only opens the menu on a real `click` (which a drag suppresses). While
// the menu is open we lock the drag-handle plugin so it stays put and visible.
export function BlockHandle({ editor }: { editor: Editor }) {
  const target = useRef<Target | null>(null);
  // The DOM element of the block currently being dragged, held so its drag
  // highlight can be cleared on drag end even if the hover target has moved on.
  const draggingEl = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  // Snapshot of the target taken when the menu opens, so the rendered options
  // reflect (and act on) the block that was under the handle at open time.
  const [menuTarget, setMenuTarget] = useState<Target | null>(null);

  const lock = useCallback(
    (locked: boolean) => {
      if (editor.isDestroyed) return;
      editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", locked));
    },
    [editor]
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      lock(next);
      if (next) setMenuTarget(target.current);
    },
    [lock]
  );

  const openMenu = useCallback(() => {
    setMenuTarget(target.current);
    handleOpenChange(true);
  }, [handleOpenChange]);

  const duplicate = useCallback(() => {
    const t = menuTarget;
    if (!t) return;
    const node = editor.state.doc.nodeAt(t.pos);
    if (!node) return;
    editor
      .chain()
      .focus()
      .insertContentAt(t.pos + node.nodeSize, node.toJSON())
      .run();
  }, [editor, menuTarget]);

  const remove = useCallback(() => {
    const t = menuTarget;
    if (!t) return;
    const node = editor.state.doc.nodeAt(t.pos);
    if (!node) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: t.pos, to: t.pos + node.nodeSize })
      .run();
  }, [editor, menuTarget]);

  const turnInto = useCallback(
    (option: TurnInto) => {
      const t = menuTarget;
      if (!t) return;
      option.apply(editor.chain().focus().setTextSelection(t.pos + 1)).run();
    },
    [editor, menuTarget]
  );

  // Keep `open` readable from the stable drag callbacks without making them a
  // dependency (which would change their identity and churn plugin registration).
  const openRef = useRef(open);
  openRef.current = open;

  // These three callbacks are passed to <DragHandle>, which re-registers its
  // ProseMirror plugin whenever any of them change identity. Re-registration
  // reconfigures the editor and recreates *all* plugin views — including the
  // drop cursor, whose own destroy() leaks its DOM element. Keeping them stable
  // is what stops the placement line from being orphaned (and lingering ~5s).
  const handleNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) => {
      target.current = node && pos >= 0 ? { node, pos } : null;
    },
    []
  );

  // Vertically center the grip on the block's first text line (and on the block
  // center for short, lineless blocks like the divider). Kept flush on the main
  // axis so the CSS hover bridge to the block edge stays intact, and memoized so
  // the config identity is stable (a changing identity would churn the plugin
  // and recreate the drop-cursor view). `target.current` mirrors the block the
  // extension is positioning for, so we read its DOM metrics for the offset.
  const handlePosition = useMemo(
    () => ({
      placement: "left-start" as const,
      middleware: [
        offset(({ rects }) => {
          const t = target.current;
          if (!t) return 0;
          const dom = editor.view.nodeDOM(t.pos);
          if (!(dom instanceof HTMLElement)) return 0;
          const cs = getComputedStyle(dom);
          let lineHeight = parseFloat(cs.lineHeight);
          if (!Number.isFinite(lineHeight)) {
            lineHeight = (parseFloat(cs.fontSize) || 16) * 1.2;
          }
          // First-line band: a real line height for textblocks; for lineless
          // blocks fall back to the block's own (possibly tiny) height.
          const band = t.node.type.isTextblock
            ? lineHeight
            : Math.min(rects.reference.height, lineHeight);
          const padTop = t.node.type.isTextblock
            ? parseFloat(cs.paddingTop) || 0
            : 0;
          // crossAxis (vertical for a left placement): shift the grip down so
          // its center meets the first line's center.
          return {
            mainAxis: 0,
            crossAxis: padTop + band / 2 - rects.floating.height / 2,
          };
        }),
      ],
    }),
    [editor]
  );

  const handleElementDragStart = useCallback(() => {
    if (openRef.current) handleOpenChange(false);
    const pos = target.current?.pos;
    if (pos != null) {
      const dom = editor.view.nodeDOM(pos);
      if (dom instanceof HTMLElement) {
        dom.classList.add("scribe-block-dragging");
        draggingEl.current = dom;
      }
    }
    // The drag-handle extension sets `view.dragging` with a NodeRange selection
    // and no `node`, so ProseMirror's drop handler removes the source via
    // `tr.deleteSelection()`. The DOM `selectionchange` fired mid-drag can
    // collapse that selection into a TextSelection, making the deletion a no-op
    // and leaving a duplicate. Pin the drag to a NodeSelection of the source
    // block (runs in a microtask, after the extension populates `view.dragging`)
    // so PM uses `node.replace`, which deletes the exact node selection-free.
    queueMicrotask(() => {
      if (editor.isDestroyed || pos == null) return;
      const dragging = editor.view.dragging as
        | { node?: NodeSelection; slice?: { content: { firstChild: PMNode | null } } }
        | null;
      if (!dragging || dragging.node) return;
      const node = editor.state.doc.nodeAt(pos);
      const sliceFirst = dragging.slice?.content?.firstChild ?? null;
      if (!node || !sliceFirst || node.type !== sliceFirst.type) return;
      try {
        dragging.node = NodeSelection.create(editor.state.doc, pos);
      } catch {
        /* pos no longer selectable; leave PM's default behavior */
      }
    });
  }, [editor, handleOpenChange]);

  const handleElementDragEnd = useCallback(() => {
    draggingEl.current?.classList.remove("scribe-block-dragging");
    draggingEl.current = null;
    // The drop cursor only schedules its fast removal on a `dragend` delivered
    // to the editor DOM. This drag starts from the handle (outside that DOM),
    // so synthesize one to clear the indicator immediately instead of waiting
    // for the plugin's ~5s fallback.
    editor.view.dom.dispatchEvent(new DragEvent("dragend"));
  }, [editor]);

  // "Turn into" only makes sense for plain textblocks (paragraph, heading,
  // code). Structural blocks (callout, columns, table, divider) just get the
  // reorder/duplicate/delete actions.
  const canTurnInto = menuTarget?.node.type.isTextblock ?? false;

  return (
    <DragHandle
      editor={editor}
      className="scribe-drag-handle"
      computePositionConfig={handlePosition}
      onNodeChange={handleNodeChange}
      onElementDragStart={handleElementDragStart}
      onElementDragEnd={handleElementDragEnd}
    >
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <span className="scribe-drag-handle-anchor" aria-hidden tabIndex={-1} />
        </DropdownMenuTrigger>
        <button
          type="button"
          className="scribe-drag-handle-btn"
          aria-label="Drag to move, click for actions"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={openMenu}
        >
          <span className="scribe-drag-handle-grip">
            <DragHandleIcon size={16} />
          </span>
        </button>
        <DropdownMenuContent
          align="start"
          side="bottom"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {canTurnInto && (
            <>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <TextIcon size={15} />
                  Turn into
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {TURN_INTO.map((option) => (
                    <DropdownMenuItem
                      key={option.label}
                      onSelect={() => turnInto(option)}
                    >
                      <option.icon size={15} />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onSelect={duplicate}>
            <CopyIcon size={15} />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem danger onSelect={remove}>
            <TrashIcon size={15} />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </DragHandle>
  );
}
