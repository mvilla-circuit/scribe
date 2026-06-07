import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Placeholder } from "@tiptap/extensions";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import type { Extensions } from "@tiptap/react";
import { Callout } from "./extensions/Callout";
import { Column, Columns } from "./extensions/Columns";
import { LinkCard } from "./extensions/LinkCard";
import { PageLink } from "./extensions/PageLink";
import { SlashCommand } from "./extensions/SlashCommand";

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
    // Raise the highlight's priority so its <mark> renders as the *outermost*
    // mark, wrapping bold/italic/etc. Otherwise a bold word inside a highlight
    // nests as <strong><mark>…</mark></strong>, splitting one highlight into
    // separate chips; as the outer mark it stays a single continuous wash.
    Highlight.extend({ priority: 110 }).configure({ multicolor: true }),
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

    // The "/" command menu, surfacing all of the above plus the built-ins.
    SlashCommand,
  ];
}
