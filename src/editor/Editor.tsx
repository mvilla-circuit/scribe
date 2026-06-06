import { useEffect } from "react";
import {
  EditorContent,
  useEditor,
  type JSONContent,
} from "@tiptap/react";
import type { Json } from "../lib/database.types";
import { buildExtensions } from "./extensions";
import { BubbleToolbar } from "./BubbleToolbar";
import { useAutosave, type PersistFn, type SaveState } from "./useAutosave";
import "./editor.css";

type EditorProps = {
  documentId: string;
  initialContent: Json;
  onPersist: PersistFn;
  onSaveStateChange?: (state: SaveState) => void;
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
export function Editor({
  documentId,
  initialContent,
  onPersist,
  onSaveStateChange,
}: EditorProps) {
  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: normalizeContent(initialContent),
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { spellcheck: "true" },
      },
    },
    [documentId]
  );

  const saveState = useAutosave(editor, onPersist);

  useEffect(() => {
    onSaveStateChange?.(saveState);
  }, [saveState, onSaveStateChange]);

  return (
    <div className="scribe-prose">
      {editor && <BubbleToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
