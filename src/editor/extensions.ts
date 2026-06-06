import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import type { Extensions } from "@tiptap/react";

// The editor's extension set. StarterKit v3 already brings paragraphs,
// headings, bold/italic/strike/code, underline, link, blockquote, lists,
// code blocks, horizontal rule, hard break, history, the list keymap, the
// trailing node, and all the markdown input rules (`## `, `- `, `> `, `**`,
// `` ` ``, `---`, …) that let us transform syntax on the fly without ever
// showing raw markdown.
//
// On top of that we layer the few marks StarterKit omits: a multicolor
// Highlight, TextStyle + Color for foreground tints, and a Placeholder that
// only nudges the first empty line.
export function buildExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    // The prompt is scoped to the empty-editor state via the `.is-editor-empty`
    // class in editor.css, so it only whispers on the first line of a blank doc.
    Placeholder.configure({ placeholder: "Start writing…" }),
  ];
}
