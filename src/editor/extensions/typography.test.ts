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
// If no rule claims the character, insert it — matching the editor's fallback
// path so multi-keystroke sequences (e.g. `->`, `<->`) can build up.
function typeChar(char: string): void {
  const { view } = editor;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (handler) =>
    handler(view, from, to, char, () => view.state.tr),
  );
  if (!handled) {
    view.dispatch(view.state.tr.insertText(char, from, to));
  }
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

describe("Typography glyph substitutions", () => {
  it("converts -> to right arrow", () => {
    mount("a");
    typeChar("-");
    typeChar(">");
    expect(editor.state.doc.textContent).toBe("a→");
  });

  it("converts <- to left arrow", () => {
    mount("");
    typeChar("<");
    typeChar("-");
    expect(editor.state.doc.textContent).toBe("←");
  });

  it("converts sequential <-> to bidirectional arrow", () => {
    mount("");
    // <- fires mid-way and converts to ←, then the trailing > must repair
    // that into the bidirectional arrow rather than leaving "←>" behind.
    typeChar("<");
    typeChar("-");
    typeChar(">");
    expect(editor.state.doc.textContent).toBe("↔");
  });

  it("converts => to double right arrow", () => {
    mount("");
    typeChar("=");
    typeChar(">");
    expect(editor.state.doc.textContent).toBe("⇒");
  });

  it("converts ... to ellipsis", () => {
    mount("");
    typeChar(".");
    typeChar(".");
    typeChar(".");
    expect(editor.state.doc.textContent).toBe("…");
  });

  it("converts +- to plus-minus", () => {
    mount("");
    typeChar("+");
    typeChar("-");
    expect(editor.state.doc.textContent).toBe("±");
  });

  it.each([
    { input: "(c)", expected: "©" },
    { input: "(C)", expected: "©" },
    { input: "(r)", expected: "®" },
    { input: "(tm)", expected: "™" },
    { input: "(TM)", expected: "™" },
  ])(
    "converts $input to $expected case-insensitively",
    ({ input, expected }) => {
      mount("");
      for (const char of input) {
        typeChar(char);
      }
      expect(editor.state.doc.textContent).toBe(expected);
    },
  );

  it("keeps --- as horizontal rule", () => {
    mount("");
    // "--" converts to an em dash first; the third "-" must still trigger
    // StarterKit's horizontal-rule rule rather than leaving stray text.
    typeChar("-");
    typeChar("-");
    typeChar("-");
    expect(JSON.stringify(editor.getJSON())).toContain(
      '"type":"horizontalRule"',
    );
  });
});
