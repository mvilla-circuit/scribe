import type { Editor, Range } from "@tiptap/core";

import {
  BookmarkIcon,
  CalloutIcon,
  CodeBlockIcon,
  Columns2Icon,
  Columns3Icon,
  DatagridCardIcon,
  DividerIcon,
  EssayIcon,
  PageLinkIcon,
  PullQuoteIcon,
  QuoteIcon,
  TableIcon,
} from "@/editor/icons";
import { normalizeUrl } from "@/editor/link-preview";
import type { IconProps } from "@/lib/make-icon";

import { BASIC_BLOCK_TYPES } from "./block-types";
import { calloutContent } from "./callout";
import { columnsContent } from "./columns";
import { insertDatagridRowCard } from "./datagrid-row-card";
import { useDatagridRowPicker } from "./datagrid-row-picker-store";
import { essayContent } from "./essay";
import { insertLinkCard } from "./link-card-commands";
import { useLinkPrompt } from "./link-prompt-store";
import { insertPageLink } from "./page-link";
import { usePagePicker } from "./page-picker-store";
import { quoteContent } from "./quote";

/** One entry in the slash (`/`) command menu: its labels, icon, and block-insert action. */
export interface SlashItem {
  title: string;
  description: string;
  icon: (props: IconProps) => React.ReactNode;
  aliases?: string[];
  // Applies the block. By contract every run first clears the typed `/query`
  // range, so the menu never leaves stray text behind.
  run: (editor: Editor, range: Range) => void;
}

// Clears the "/query" text, returning a focused chain positioned where it was.
function at(editor: Editor, range: Range) {
  return editor.chain().focus().deleteRange(range);
}

const slashItems: SlashItem[] = [
  // The basic textblock conversions, shared verbatim with the block handle's
  // "Turn into" submenu. Slash runs them after clearing the typed "/query".
  ...BASIC_BLOCK_TYPES.map((block): SlashItem => ({
    title: block.title,
    description: block.description,
    icon: block.icon,
    aliases: block.aliases,
    run: (editor, range) => block.command(at(editor, range)).run(),
  })),
  {
    title: "Pull quote",
    description: "A bold statement with a large quote mark",
    icon: PullQuoteIcon,
    aliases: ["pullquote", "quote", "feature", "callout quote"],
    run: (editor, range) =>
      at(editor, range).insertContent(quoteContent("pullquote")).run(),
  },
  {
    title: "Accent quote",
    description: "A quotation with a colored side rule",
    icon: QuoteIcon,
    aliases: ["accentquote", "quote", "citation", "rule"],
    run: (editor, range) =>
      at(editor, range).insertContent(quoteContent("accentquote")).run(),
  },
  {
    title: "Code block",
    description: "Code with syntax spacing",
    icon: CodeBlockIcon,
    aliases: ["pre", "snippet", "monospace"],
    run: (editor, range) => at(editor, range).toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    description: "Visually separate sections",
    icon: DividerIcon,
    aliases: ["hr", "rule", "separator", "line"],
    run: (editor, range) => at(editor, range).setHorizontalRule().run(),
  },
  {
    title: "Callout",
    description: "Make text stand out",
    icon: CalloutIcon,
    aliases: ["note", "info", "tip", "warning", "aside"],
    run: (editor, range) =>
      at(editor, range).insertContent(calloutContent()).run(),
  },
  {
    title: "Essay",
    description: "A long-form titled essay section",
    icon: EssayIcon,
    aliases: ["article", "longform", "story", "title", "section"],
    run: (editor, range) =>
      at(editor, range).insertContent(essayContent()).run(),
  },
  {
    title: "Columns (2)",
    description: "Two equal columns",
    icon: Columns2Icon,
    aliases: ["grid", "layout", "2col"],
    run: (editor, range) =>
      at(editor, range).insertContent(columnsContent(2)).run(),
  },
  {
    title: "Columns (3)",
    description: "Three equal columns",
    icon: Columns3Icon,
    aliases: ["grid", "layout", "3col"],
    run: (editor, range) =>
      at(editor, range).insertContent(columnsContent(3)).run(),
  },
  {
    title: "Table",
    description: "Rows and columns of cells",
    icon: TableIcon,
    aliases: ["grid", "spreadsheet", "data"],
    run: (editor, range) =>
      at(editor, range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Bookmark",
    description: "A rich preview of a web link",
    icon: BookmarkIcon,
    aliases: ["link", "url", "embed", "web"],
    run: (editor, range) => {
      at(editor, range).run();
      useLinkPrompt.getState().open((input) => {
        const url = normalizeUrl(input);
        if (url) insertLinkCard(editor, url);
      });
    },
  },
  {
    title: "Link to page",
    description: "Reference another page or book",
    icon: PageLinkIcon,
    aliases: ["page", "internal", "mention", "ref"],
    run: (editor, range) => {
      at(editor, range).run();
      usePagePicker.getState().open((target) => {
        insertPageLink(editor, target);
      });
    },
  },
  {
    title: "Datagrid card",
    description: "Embed a card from a datagrid",
    icon: DatagridCardIcon,
    aliases: ["datagrid", "database", "row", "card", "embed"],
    run: (editor, range) => {
      at(editor, range).run();
      useDatagridRowPicker.getState().open((target) => {
        insertDatagridRowCard(editor, target);
      });
    },
  },
];

/** Case-insensitive filter across title + aliases, preserving registry order. */
export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return slashItems;
  return slashItems.filter((item) => {
    if (item.title.toLowerCase().includes(q)) return true;
    return (item.aliases ?? []).some((a) => a.toLowerCase().includes(q));
  });
}
