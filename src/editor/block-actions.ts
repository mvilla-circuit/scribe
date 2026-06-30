import type { JSONContent } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";

// Block-level actions for the gutter handle menu, lifted out of the
// BlockHandle component so the operations (and the trickiest one — column
// reshaping — in particular) can be reasoned about and unit-tested apart from
// the drag-handle/menu wiring. Each takes the editor and the absolute position
// of the target block and re-reads the live node, so a stale snapshot can never
// act on the wrong block.

/** Insert a copy of the block right after it. */
export function duplicateBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor
    .chain()
    .focus()
    .insertContentAt(pos + node.nodeSize, node.toJSON() as JSONContent)
    .run();
}

/** Delete the block at `pos`. */
export function removeBlock(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor
    .chain()
    .focus()
    .deleteRange({ from: pos, to: pos + node.nodeSize })
    .run();
}

/**
 * Copy the whole block to the system clipboard so it survives a hop to another
 * document (each document is its own editor instance). Reuses ProseMirror's
 * clipboard serialization so a later paste reconstructs the block losslessly,
 * with a plain-text alternative for other apps. Returns true when the copy
 * succeeded (so the caller can surface a toast). Falls back to the browser's
 * native copy command when the async Clipboard API is unavailable.
 */
export async function copyBlock(editor: Editor, pos: number): Promise<boolean> {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return false;
  let selection: NodeSelection;
  try {
    selection = NodeSelection.create(editor.state.doc, pos);
  } catch {
    return false;
  }
  const { dom, text } = editor.view.serializeForClipboard(selection.content());
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([dom.innerHTML], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      }),
    ]);
    return true;
  } catch {
    // Clipboard API can be blocked (permissions, insecure context). Fall back
    // to selecting the node and letting the browser's native copy command run
    // through ProseMirror's own copy handler.
    editor.chain().focus().setNodeSelection(pos).run();
    // Deliberate fallback when the async Clipboard API is unavailable
    // (permissions / insecure context); execCommand still works here.
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Deliberate fallback: execCommand("copy") is the only option when the async Clipboard API is unavailable.
    return document.execCommand("copy");
  }
}

/**
 * Compute the content a `columns` block should hold for a new column count,
 * preserving the existing per-column blocks. Reducing the count folds the
 * trailing column(s) into the last one kept; increasing it appends empty
 * columns; `count <= 1` flattens back to plain blocks. Pure over the extracted
 * per-column block arrays so the reshape rules are unit-testable.
 *
 * Returns an array of blocks to splice in (the flattened case) or a single
 * `columns` node (2+ columns).
 */
export function reshapeColumns(
  columns: JSONContent[][],
  count: number,
): JSONContent | JSONContent[] {
  if (count <= 1) {
    const blocks = columns.flat();
    const allEmpty = blocks.every(
      (b) => b.type === "paragraph" && !b.content?.length,
    );
    return blocks.length === 0 || allEmpty ? [{ type: "paragraph" }] : blocks;
  }

  const newColumns: JSONContent[] = [];
  for (let i = 0; i < count; i++) {
    const blocks = i < count - 1 ? (columns[i] ?? []) : columns.slice(i).flat();
    newColumns.push({
      type: "column",
      content: blocks.length ? blocks : [{ type: "paragraph" }],
    });
  }
  return { type: "columns", content: newColumns };
}

/**
 * Re-shape the `columns` block at `pos` to `count` columns (see
 * {@link reshapeColumns}). No-op when the target isn't a columns block.
 */
export function setColumnCount(editor: Editor, pos: number, count: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (node?.type.name !== "columns") return;

  const columns: JSONContent[][] = [];
  node.forEach((col) => {
    const blocks: JSONContent[] = [];
    col.forEach((child) => blocks.push(child.toJSON() as JSONContent));
    columns.push(blocks);
  });

  const range = { from: pos, to: pos + node.nodeSize };
  editor
    .chain()
    .focus()
    .insertContentAt(range, reshapeColumns(columns, count))
    .run();
}
