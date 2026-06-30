import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { Typography } from "./typography";

let editor: Editor;

function mount(text: string): Editor {
  editor = new Editor({
    extensions: [StarterKit, Typography],
    // Seed via JSON, not HTML: the HTML parser trims trailing whitespace, which
    // would silently drop the leading space these boundary rules depend on.
    content: {
      type: "doc",
      content: [
        text
          ? { type: "paragraph", content: [{ type: "text", text }] }
          : { type: "paragraph" },
      ],
    },
  });
  // Caret at the end of the seeded paragraph, where the next keystroke lands.
  editor.commands.setTextSelection(editor.state.doc.content.size - 1);
  return editor;
}

// Drive the real input-rule pipeline the way ProseMirror does on a keystroke:
// the `inputRules` plugin exposes `handleTextInput`, which inspects the text
// before the caret plus the new character and applies the first matching rule.
function typeChar(char: string): void {
  const { view } = editor;
  const { from, to } = view.state.selection;
  view.someProp("handleTextInput", (handler) =>
    handler(view, from, to, char, () => view.state.tr),
  );
}

afterEach(() => {
  editor?.destroy();
});

describe("Typography smart quotes", () => {
  it("opens a double quote at the start of a block", () => {
    mount("");
    typeChar('"');
    expect(editor.state.doc.textContent).toBe("“");
  });

  it("opens a double quote after whitespace", () => {
    mount("said ");
    typeChar('"');
    expect(editor.state.doc.textContent).toBe("said “");
  });

  it("closes a double quote after a word", () => {
    mount("“hello");
    typeChar('"');
    expect(editor.state.doc.textContent).toBe("“hello”");
  });

  it("opens a single quote after whitespace", () => {
    mount("say ");
    typeChar("'");
    expect(editor.state.doc.textContent).toBe("say ‘");
  });

  it("uses a closing single quote for contractions", () => {
    mount("it");
    typeChar("'");
    expect(editor.state.doc.textContent).toBe("it’");
  });

  it("keeps converting straight to em dash", () => {
    mount("a-");
    typeChar("-");
    expect(editor.state.doc.textContent).toBe("a—");
  });
});
