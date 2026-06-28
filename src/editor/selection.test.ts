import { Editor } from "@tiptap/core";
import { AllSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { hasFormattableSelection } from "./selection";

let editor: Editor | null = null;

function makeEditor(html: string): Editor {
  editor = new Editor({ extensions: [StarterKit], content: html });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("hasFormattableSelection", () => {
  it("is true for a text selection over a word", () => {
    const e = makeEditor("<p>example</p>");
    e.commands.setTextSelection({ from: 1, to: 8 });

    expect(hasFormattableSelection(e)).toBe(true);
  });

  it("is true for a select-all (AllSelection) over real text", () => {
    const e = makeEditor("<p>example</p>");
    // Mirror what Cmd/Ctrl+A does: ProseMirror's selectAll sets an
    // AllSelection, not a TextSelection.
    e.view.dispatch(e.state.tr.setSelection(new AllSelection(e.state.doc)));
    expect(e.state.selection).toBeInstanceOf(AllSelection);

    expect(hasFormattableSelection(e)).toBe(true);
  });

  it("is false for a collapsed (empty) selection", () => {
    const e = makeEditor("<p>example</p>");
    e.commands.setTextSelection({ from: 1, to: 1 });

    expect(hasFormattableSelection(e)).toBe(false);
  });

  it("is false for a select-all over an empty document", () => {
    const e = makeEditor("<p></p>");
    e.view.dispatch(e.state.tr.setSelection(new AllSelection(e.state.doc)));

    expect(hasFormattableSelection(e)).toBe(false);
  });
});
