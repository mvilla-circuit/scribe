import type { Editor } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/**
 * A ProseMirror plugin whose only job is a `handlePaste` hook: it reads the
 * plain-text clipboard payload and hands it to `onPasteText`, which returns true
 * to claim the paste (having inserted its own node) or false to let the default
 * paste proceed. Shared by the URL bookmark and page-link cards, which differ
 * only in how they recognize and handle the pasted text.
 */
export function pastePlugin(
  editor: Editor,
  onPasteText: (text: string, editor: Editor, view: EditorView) => boolean,
): Plugin {
  return new Plugin({
    props: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain") ?? "";
        return onPasteText(text, editor, view);
      },
    },
  });
}
