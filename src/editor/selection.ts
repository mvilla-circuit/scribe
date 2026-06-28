import type { Editor } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

/**
 * Whether the editor holds a genuine, formattable text selection: a non-empty
 * {@link TextSelection} over real text (not just whitespace) and not inside a
 * code block. This is the shared guard behind showing the inline bubble toolbar
 * and hiding the table toolbar while it's up, so both agree on exactly when
 * inline formatting applies.
 */
export function hasFormattableSelection(editor: Editor): boolean {
  const { selection } = editor.state;
  if (!(selection instanceof TextSelection) || selection.empty) return false;
  if (editor.isActive("codeBlock")) return false;
  return (
    editor.state.doc.textBetween(selection.from, selection.to).trim().length > 0
  );
}
