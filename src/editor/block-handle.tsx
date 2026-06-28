import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { ChainedCommands, Editor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  copyBlock,
  duplicateBlock,
  removeBlock,
  setColumnCount,
  turnIntoBlock,
} from "./block-actions";
import type { BlockTarget } from "./block-handle-target";
import { BlockMenu } from "./block-menu";
import { DragHandleIcon } from "./icons";
import { useBlockHandleDrag } from "./use-block-handle-drag";
import { useBlockHandlePosition } from "./use-block-handle-position";

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
  // The block currently under the gutter handle; a ref so the stable drag and
  // position callbacks can read it without re-registering the plugin.
  const target = useRef<BlockTarget | null>(null);
  const [open, setOpen] = useState(false);
  // Snapshot of the target taken when the menu opens, so the rendered options
  // reflect (and act on) the block that was under the handle at open time.
  const [menuTarget, setMenuTarget] = useState<BlockTarget | null>(null);

  const lock = useCallback(
    (locked: boolean) => {
      if (editor.isDestroyed) return;
      editor.view.dispatch(editor.state.tr.setMeta("lockDragHandle", locked));
    },
    [editor],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      lock(next);
      if (next) setMenuTarget(target.current);
    },
    [lock, target],
  );

  const openMenu = useCallback(() => {
    setMenuTarget(target.current);
    handleOpenChange(true);
  }, [handleOpenChange, target]);

  const closeMenu = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const duplicate = useCallback(() => {
    if (menuTarget) duplicateBlock(editor, menuTarget.pos);
  }, [editor, menuTarget]);

  const copy = useCallback(async () => {
    if (menuTarget && (await copyBlock(editor, menuTarget.pos))) {
      toast.success("Block copied");
    }
  }, [editor, menuTarget]);

  const remove = useCallback(() => {
    if (menuTarget) removeBlock(editor, menuTarget.pos);
  }, [editor, menuTarget]);

  const turnInto = useCallback(
    (apply: (chain: ChainedCommands) => ChainedCommands) => {
      if (menuTarget) turnIntoBlock(editor, menuTarget.pos, apply);
    },
    [editor, menuTarget],
  );

  const changeColumns = useCallback(
    (count: number) => {
      if (menuTarget) setColumnCount(editor, menuTarget.pos, count);
    },
    [editor, menuTarget],
  );

  // These callbacks are passed to <DragHandle>, so they must keep a stable
  // identity (see the hooks for why a churn leaks the drop cursor).
  const handleNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) => {
      target.current = node && pos >= 0 ? { node, pos } : null;
    },
    [target],
  );

  const handlePosition = useBlockHandlePosition(editor, target);
  const { onElementDragStart, onElementDragEnd } = useBlockHandleDrag({
    editor,
    targetRef: target,
    open,
    onCloseMenu: closeMenu,
  });

  return (
    <DragHandle
      editor={editor}
      className="scribe-drag-handle"
      computePositionConfig={handlePosition}
      onNodeChange={handleNodeChange}
      onElementDragStart={onElementDragStart}
      onElementDragEnd={onElementDragEnd}
    >
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <span
            className="scribe-drag-handle-anchor"
            aria-hidden
            tabIndex={-1}
          />
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
        <BlockMenu
          target={menuTarget}
          onTurnInto={turnInto}
          onChangeColumns={changeColumns}
          onCopy={copy}
          onDuplicate={duplicate}
          onRemove={remove}
        />
      </DropdownMenu>
    </DragHandle>
  );
}
