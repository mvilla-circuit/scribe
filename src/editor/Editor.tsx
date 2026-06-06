import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {
  EditorContent,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import type { Json } from "../lib/database.types";
import { buildExtensions } from "./extensions";
import { BubbleToolbar } from "./BubbleToolbar";
import { extractHeadings, type OutlineHeading } from "./outline";
import { useAutosave, type PersistFn, type SaveState } from "./useAutosave";
import "./editor.css";

export type EditorHandle = {
  /** Smooth-scroll the heading at the given ProseMirror position into view. */
  scrollToPos: (pos: number) => void;
};

type EditorProps = {
  documentId: string;
  initialContent: Json;
  onPersist: PersistFn;
  onSaveStateChange?: (state: SaveState) => void;
  editable?: boolean;
  onOutlineChange?: (headings: OutlineHeading[]) => void;
};

// Stored documents start life as an empty `{}` placeholder; only a real
// ProseMirror doc has a `type`. Anything else maps to a blank editor.
function normalizeContent(content: Json): JSONContent | undefined {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return undefined;
  }
  if (!("type" in content)) return undefined;
  return content as JSONContent;
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
  },
  ref
) {
  // Keep the latest outline callback in a ref so the editor's `onCreate` /
  // `onUpdate` handlers (captured once at creation) always call the current one.
  const onOutlineChangeRef = useRef(onOutlineChange);
  useEffect(() => {
    onOutlineChangeRef.current = onOutlineChange;
  }, [onOutlineChange]);

  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: normalizeContent(initialContent),
      editable,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { spellcheck: "true" },
      },
      onCreate: ({ editor }) =>
        onOutlineChangeRef.current?.(extractHeadings(editor)),
      onUpdate: ({ editor }) =>
        onOutlineChangeRef.current?.(extractHeadings(editor)),
    },
    [documentId]
  );

  const saveState = useAutosave(editor, onPersist);

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

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
        const heading = el?.closest("h1, h2, h3") ?? el;
        heading?.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    }),
    [editor]
  );

  return (
    <div className="scribe-prose">
      {editor && editable && <BubbleToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
});
