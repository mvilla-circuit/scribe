import Code from "@tiptap/extension-code";
import Highlight from "@tiptap/extension-highlight";
import { TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extensions";
import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import { Callout } from "./extensions/callout";
import { Column, Columns } from "./extensions/columns";
import { DatagridRowCard } from "./extensions/datagrid-row-card";
import { Essay } from "./extensions/essay";
import { Indent } from "./extensions/indent";
import { LinkCard } from "./extensions/link-card";
import { PageLink } from "./extensions/page-link";
import { Quote } from "./extensions/quote";
import { SlashCommand } from "./extensions/slash-command";
import { Spellcheck, type SpellcheckOptions } from "./extensions/spellcheck";
import { Table, TableCell, TableHeader } from "./extensions/table";
import { Typography } from "./extensions/typography";
import { HEADING_LEVELS } from "./headings";

/**
 * The editor's extension set. StarterKit v3 already brings paragraphs,
 * headings, bold/italic/strike/code, underline, link, blockquote, lists,
 * code blocks, horizontal rule, hard break, history, the list keymap, the
 * trailing node, and all the markdown input rules (`## `, `- `, `> `, `**`,
 * `` ` ``, `---`, …) that let us transform syntax on the fly without ever
 * showing raw markdown.
 *
 * On top of that we layer the few marks StarterKit omits: a multicolor
 * Highlight, TextStyle + Color for foreground tints, and a Placeholder that
 * only nudges the first empty line.
 *
 * `spellcheck` wires the custom spell checker; when omitted (e.g. schema-only
 * uses) the extension is added inert (disabled, no checker) so squiggles never
 * render.
 */
export function buildExtensions(spellcheck?: SpellcheckOptions): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [...HEADING_LEVELS] },
      dropcursor: {
        color: "var(--color-accent)",
        width: 3,
        class: "scribe-dropcursor",
      },
      // Disabled in favour of the color-aware Underline added below.
      underline: false,
      // Disabled in favour of the multi-variant Quote node added below, which
      // owns the "> " input rule and the three quote treatments.
      blockquote: false,
      // Disabled in favour of the combinable inline Code added below.
      code: false,
      // We handle link clicks ourselves (open in the OS browser via the Tauri
      // opener) and show an inline link popover, so disable StarterKit's built-in
      // open-on-click.
      link: { openOnClick: false },
    }),
    // Raise the highlight's priority so its <mark> wraps bold/italic/etc.
    // (everything except the underline, which sits one level further out at
    // 120). Otherwise a bold word inside a highlight nests as
    // <strong><mark>…</mark></strong>, splitting one highlight into separate
    // chips; above those marks it stays a single continuous wash.
    Highlight.extend({ priority: 110 }).configure({ multicolor: true }),
    // Underline carries an optional `color` so it can be tinted from the color
    // flyout like a highlighter. A null color falls back to the elegant default
    // underline styling in editor.css; a value writes an inline
    // `text-decoration-color` that overrides it.
    //
    // Priority 120 makes the <u> the *outermost* mark — above the highlight
    // (110) and the default bold/italic/strike/code (100). Otherwise an inner
    // italic word (or a partially-overlapping highlight) would split one
    // underline into separate <u> fragments, and with rounded, cloned caps that
    // reads as a broken line. As the outer mark the bar stays a single
    // continuous stroke no matter what other marks sit underneath it.
    Underline.extend({
      priority: 120,
      addAttributes() {
        return {
          color: {
            default: null,
            parseHTML: (el) =>
              el.style.getPropertyValue("--scribe-underline") || null,
            renderHTML: (attrs) =>
              attrs.color ? { style: `--scribe-underline:${attrs.color}` } : {},
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
    // Horizontal text alignment, scoped to the block types that appear inside
    // table cells. The table controls expose left/center/right for the selected
    // cells; the command also works on a plain caret elsewhere, it just has no
    // UI outside the table toolbar. Alignment renders as an inline `text-align`
    // style on the paragraph/heading, overriding the cell's left default.
    TextAlign.configure({ types: ["paragraph", "heading"] }),
    // The prompt is scoped to the empty-editor state via the `.is-editor-empty`
    // class in editor.css, so it only whispers on the first line of a blank doc.
    Placeholder.configure({ placeholder: "Start writing…" }),

    // To-do list. TaskList ships the `[] `/`[ ] ` input rule, so it also works
    // by typing; `nested` lets a task hold sub-tasks.
    TaskList,
    TaskItem.configure({ nested: true }),

    // Table family: resizable columns with a header row, plus a per-table header
    // color (see ./extensions/Table). The inline add/remove/color controls live
    // in `TableControls`, driven by these extensions' commands.
    Table,
    TableRow,
    TableHeader,
    TableCell,

    // Phase 5 custom blocks.
    Callout,
    Columns,
    Column,
    Essay,
    LinkCard,
    PageLink,
    DatagridRowCard,
    Quote,

    // Tab / Shift-Tab block indentation for paragraphs and headings.
    Indent,

    // Our own typographic substitutions (e.g. `--` → em dash) so they fire in
    // every text block instead of depending on the OS's smart-dash setting.
    Typography,

    // The "/" command menu, surfacing all of the above plus the built-ins.
    SlashCommand,

    // Custom spell/grammar checking: red squiggles for misspellings, a click
    // menu with suggestions, and a scaffolded (no-op) grammar provider. Inert
    // unless configured with an enabled document + checker.
    spellcheck ? Spellcheck.configure(spellcheck) : Spellcheck,
  ];
}
