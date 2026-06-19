import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Underline from "@tiptap/extension-underline";
import Code from "@tiptap/extension-code";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import type { Extensions } from "@tiptap/react";
import { Callout } from "./extensions/Callout";
import { Column, Columns } from "./extensions/Columns";
import { Indent } from "./extensions/Indent";
import { LinkCard } from "./extensions/LinkCard";
import { PageLink } from "./extensions/PageLink";
import { Quote } from "./extensions/Quote";
import { SlashCommand } from "./extensions/SlashCommand";
import { Typography } from "./extensions/Typography";

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
      dropcursor: { color: "var(--color-accent)", width: 3, class: "scribe-dropcursor" },
      // Disabled in favour of the color-aware Underline added below.
      underline: false,
      // Disabled in favour of the multi-variant Quote node added below, which
      // owns the "> " input rule and the three quote treatments.
      blockquote: false,
      // Disabled in favour of the combinable inline Code added below.
      code: false,
    }),
    // Raise the highlight's priority so its <mark> renders as the *outermost*
    // mark, wrapping bold/italic/etc. Otherwise a bold word inside a highlight
    // nests as <strong><mark>…</mark></strong>, splitting one highlight into
    // separate chips; as the outer mark it stays a single continuous wash.
    Highlight.extend({ priority: 110 }).configure({ multicolor: true }),
    // Underline carries an optional `color` so it can be tinted from the color
    // flyout like a highlighter. A null color falls back to the elegant default
    // underline styling in editor.css; a value writes an inline
    // `text-decoration-color` that overrides it.
    Underline.extend({
      addAttributes() {
        return {
          color: {
            default: null,
            parseHTML: (el) =>
              el.style.getPropertyValue("--scribe-underline") || null,
            renderHTML: (attrs) =>
              attrs.color
                ? { style: `--scribe-underline:${attrs.color}` }
                : {},
          },
        };
      },
    }),
    // Inline code that composes with the other inline marks. StarterKit's code
    // mark sets `excludes: "_"`, which forbids bold/italic/color/highlight from
    // ever sharing the same text; clearing `excludes` lets them coexist so a
    // code span can still be emphasized, tinted, or highlighted.
    Code.extend({ excludes: "" }),
    TextStyle,
    Color,
    // The prompt is scoped to the empty-editor state via the `.is-editor-empty`
    // class in editor.css, so it only whispers on the first line of a blank doc.
    Placeholder.configure({ placeholder: "Start writing…" }),

    // To-do list. TaskList ships the `[] `/`[ ] ` input rule, so it also works
    // by typing; `nested` lets a task hold sub-tasks.
    TaskList,
    TaskItem.configure({ nested: true }),

    // Table family: resizable columns with a header row. The inline add/remove
    // controls live in `TableControls`, driven by these extensions' commands.
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,

    // Phase 5 custom blocks.
    Callout,
    Columns,
    Column,
    LinkCard,
    PageLink,
    Quote,

    // Tab / Shift-Tab block indentation for paragraphs and headings.
    Indent,

    // Our own typographic substitutions (e.g. `--` → em dash) so they fire in
    // every text block instead of depending on the OS's smart-dash setting.
    Typography,

    // The "/" command menu, surfacing all of the above plus the built-ins.
    SlashCommand,
  ];
}
