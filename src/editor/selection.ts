import type { Editor } from "@tiptap/core";
import { AllSelection, TextSelection } from "@tiptap/pm/state";

/**
 * Whether the editor holds a genuine, formattable text selection: a non-empty
 * range over real text (not just whitespace) and not inside a code block. This
 * is the shared guard behind showing the inline bubble toolbar and hiding the
 * table toolbar while it's up, so both agree on exactly when inline formatting
 * applies.
 *
 * Both a {@link TextSelection} (drag/shift-select) and an {@link AllSelection}
 * (Cmd/Ctrl+A — ProseMirror's select-all dispatches an `AllSelection`, not a
 * `TextSelection`) count; node and cell selections deliberately don't, so the
 * toolbar stays off hr/image nodes and multi-cell table ranges.
 */
export function hasFormattableSelection(editor: Editor): boolean {
  const { selection } = editor.state;
  const isTextRange =
    selection instanceof TextSelection || selection instanceof AllSelection;
  if (!isTextRange || selection.empty) return false;
  if (editor.isActive("codeBlock")) return false;
  return (
    editor.state.doc.textBetween(selection.from, selection.to).trim().length > 0
  );
}
