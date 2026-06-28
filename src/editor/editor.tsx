import "./editor.css";

import { EditorContent, type JSONContent, useEditor } from "@tiptap/react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import type { Json } from "@/lib/database.types";

import { BlockHandle } from "./block-handle";
import { BubbleToolbar } from "./bubble-toolbar";
import { buildExtensions } from "./extensions";
import { LinkPrompt } from "./extensions/link-prompt";
import { PagePicker } from "./extensions/page-picker";
import { TableControls } from "./extensions/table-controls";
import { HEADING_SELECTOR } from "./headings";
import { extractHeadings, type OutlineHeading } from "./outline";
import { CALLOUT_DEFAULT } from "./palette";
import { type PersistFn, type SaveState, useAutosave } from "./use-autosave";
import { useTableScrollShadows } from "./use-table-scroll-shadows";

// Debounce window for recomputing the page outline. The outline only feeds the
// navigation rail, so a short settle delay is imperceptible and keeps the
// whole-document `extractHeadings` walk off the per-keystroke path.
const OUTLINE_DEBOUNCE_MS = 300;

export interface EditorHandle {
  /** Smooth-scroll the heading at the given ProseMirror position into view. */
  scrollToPos: (pos: number) => void;
  /**
   * Focus the body and place the caret on the first row, creating an empty
   * first paragraph when one isn't already there. Used to carry the caret down
   * from the page title on Enter.
   */
  focusStart: () => void;
}

interface EditorProps {
  documentId: string;
  initialContent: Json;
  onPersist: PersistFn;
  onSaveStateChange?: (state: SaveState) => void;
  editable?: boolean;
  onOutlineChange?: (headings: OutlineHeading[]) => void;
  // Fired when Backspace is pressed with the caret on an empty first row, so the
  // caller can hand focus back to the page title. Return `true` if the handoff
  // happened (which suppresses the default delete).
  onLeaveStart?: () => boolean | undefined;
}

// Rewrite legacy "block quote" content into the `callout` block, which replaced
// it. Two shapes are migrated: old StarterKit `blockquote` nodes (no longer in
// the schema) and `quote` nodes saved with the now-removed `blockquote` variant.
// Both carry `paragraph+` content that the callout's `block+` body accepts; the
// quote's attribution (callouts have none) is dropped. This keeps older
// documents intact instead of dropping the block on load.
function isLegacyBlockQuote(node: JSONContent): boolean {
  return (
    node.type === "blockquote" ||
    (node.type === "quote" && node.attrs?.variant === "blockquote")
  );
}

function migrateLegacyQuotes(node: JSONContent): JSONContent {
  const migrated: JSONContent = isLegacyBlockQuote(node)
    ? {
        ...node,
        type: "callout",
        attrs: { color: CALLOUT_DEFAULT.color, icon: null },
      }
    : node;
  if (!Array.isArray(migrated.content)) return migrated;
  // Recurse, but return the original node reference when nothing in the subtree
  // changed so a modern document isn't deep-cloned on every editor mount.
  let changed = migrated !== node;
  const content = migrated.content.map((child) => {
    const next = migrateLegacyQuotes(child);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...migrated, content } : migrated;
}

// Stored documents start life as an empty `{}` placeholder; only a real
// ProseMirror doc has a `type`. Anything else maps to a blank editor.
function normalizeContent(content: Json): JSONContent | undefined {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return undefined;
  }
  if (!("type" in content)) return undefined;
  return migrateLegacyQuotes(content);
}

// The writing surface. One editor instance per document (the call site keys it
// by `documentId`, so switching pages gives a clean slate with its own undo
// history). Autosave is invisible and debounced; the bubble toolbar floats over
// selections. Markdown shortcuts transform live via StarterKit's input rules,
// so raw syntax is never shown.
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    documentId,
    initialContent,
    onPersist,
    onSaveStateChange,
    editable = true,
    onOutlineChange,
    onLeaveStart,
  },
  ref,
) {
  // Keep the latest outline callback in a ref so the editor's `onCreate` /
  // `onUpdate` handlers (captured once at creation) always call the current one.
  const onOutlineChangeRef = useRef(onOutlineChange);
  useEffect(() => {
    onOutlineChangeRef.current = onOutlineChange;
  }, [onOutlineChange]);

  // Same pattern for the start-of-document Backspace handler, which is captured
  // once inside `editorProps` (rebuilt only per document).
  const onLeaveStartRef = useRef(onLeaveStart);
  useEffect(() => {
    onLeaveStartRef.current = onLeaveStart;
  }, [onLeaveStart]);

  // Keep the latest save-state callback in a ref so a fresh callback identity
  // doesn't re-run the reporting effect; only an actual `saveState` change
  // should notify the parent.
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);

  // Debounced outline recompute (see OUTLINE_DEBOUNCE_MS). Cleared when the
  // document changes or the editor unmounts so a pending timer never walks a
  // torn-down editor.
  const outlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (outlineTimer.current) {
        clearTimeout(outlineTimer.current);
        outlineTimer.current = null;
      }
    };
  }, [documentId]);

  // Build the extension set and normalize the body once per editor instance
  // rather than on every render. `useEditor` only consumes these when its dep
  // array (`[documentId]`) changes, so recomputing them each render — e.g. on a
  // save-state transition — just allocated ~25 extensions and re-walked the
  // whole document for nothing.
  const extensions = useMemo(() => buildExtensions(), []);
  const content = useMemo(
    () => normalizeContent(initialContent),
    [initialContent],
  );

  const editor = useEditor(
    {
      extensions,
      content,
      editable,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { spellcheck: "true" },
        // Keep the caret clear of the viewport's bottom edge while typing: when
        // ProseMirror scrolls the cursor into view, trigger the scroll early and
        // leave a comfortable gap beneath it (and a small one up top to clear the
        // sticky breadcrumb). Paired with the editor's trailing bottom padding so
        // the last lines actually have room to lift off the bottom.
        scrollThreshold: { top: 80, bottom: 160, left: 0, right: 0 },
        scrollMargin: { top: 80, bottom: 160, left: 0, right: 0 },
        // Backspace on an empty first row hands focus back to the page title
        // (the inverse of Enter-from-title). Only fires when the caret sits at
        // the very start of an empty leading paragraph.
        handleKeyDown: (view, event) => {
          if (event.key !== "Backspace") return false;
          const { selection, doc } = view.state;
          if (!selection.empty || selection.from !== 1) return false;
          const first = doc.firstChild;
          const firstRowEmpty =
            first?.type.name === "paragraph" && first.content.size === 0;
          if (!firstRowEmpty || !first) return false;
          // Remove the empty leading row before handing off — but only when
          // there's content beneath it; the document must always keep one block,
          // so a lone empty paragraph is left in place.
          if (doc.childCount > 1) {
            view.dispatch(view.state.tr.delete(0, first.nodeSize));
          }
          return onLeaveStartRef.current?.() === true;
        },
      },
      onCreate: ({ editor }) =>
        onOutlineChangeRef.current?.(extractHeadings(editor)),
      onUpdate: ({ editor, transaction }) => {
        // The outline only changes when the document structure does, so skip
        // pure selection/metadata transactions, and debounce the rest so a
        // burst of typing recomputes the whole-document outline once when it
        // settles rather than on every keystroke.
        if (!transaction.docChanged) return;
        if (outlineTimer.current) clearTimeout(outlineTimer.current);
        outlineTimer.current = setTimeout(() => {
          onOutlineChangeRef.current?.(extractHeadings(editor));
        }, OUTLINE_DEBOUNCE_MS);
      },
    },
    [documentId],
  );

  const saveState = useAutosave(editor, onPersist);

  useTableScrollShadows(editor);

  useEffect(() => {
    onSaveStateChangeRef.current?.(saveState);
  }, [saveState]);

  // Reflect read/edit mode onto the live instance without recreating it.
  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToPos: (pos: number) => {
        if (!editor) return;
        const { node } = editor.view.domAtPos(pos);
        const el =
          node.nodeType === Node.TEXT_NODE
            ? node.parentElement
            : (node as HTMLElement);
        const heading = el?.closest(`${HEADING_SELECTOR}, .scribe-essay`) ?? el;
        heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      focusStart: () => {
        if (!editor) return;
        const first = editor.state.doc.firstChild;
        const firstRowEmpty =
          first?.type.name === "paragraph" && first.content.size === 0;
        const chain = editor.chain().focus();
        // Land on an empty first row to type into: reuse one if the document
        // already opens with an empty paragraph, otherwise insert a fresh row
        // above the existing content.
        if (!firstRowEmpty) chain.insertContentAt(0, { type: "paragraph" });
        chain.setTextSelection(1).run();
      },
    }),
    [editor],
  );

  return (
    <div className="scribe-prose">
      {editor && editable && (
        <>
          <BubbleToolbar editor={editor} />
          <BlockHandle editor={editor} />
          <TableControls editor={editor} />
          <PagePicker />
          <LinkPrompt />
        </>
      )}
      <EditorContent editor={editor} />
    </div>
  );
});
