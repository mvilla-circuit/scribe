import type { Editor, Range } from "@tiptap/core";

import {
  BookmarkIcon,
  BulletListIcon,
  CalloutIcon,
  CodeBlockIcon,
  Columns2Icon,
  Columns3Icon,
  DividerIcon,
  EssayIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  OrderedListIcon,
  PageLinkIcon,
  PullQuoteIcon,
  QuoteIcon,
  TableIcon,
  TaskListIcon,
  TextIcon,
} from "@/editor/icons";
import { normalizeUrl } from "@/editor/linkPreview";
import type { IconProps } from "@/lib/makeIcon";

import { calloutContent } from "./Callout";
import { columnsContent } from "./Columns";
import { essayContent } from "./Essay";
import { insertLinkCard } from "./linkCardCommands";
import { insertPageLink } from "./PageLink";
import { usePagePicker } from "./pagePickerStore";
import { quoteContent } from "./Quote";

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
  {
    title: "Text",
    description: "Plain paragraph",
    icon: TextIcon,
    aliases: ["paragraph", "p", "body"],
    run: (editor, range) => at(editor, range).setParagraph().run(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1Icon,
    aliases: ["h1", "title"],
    run: (editor, range) =>
      at(editor, range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2Icon,
    aliases: ["h2", "subtitle"],
    run: (editor, range) =>
      at(editor, range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3Icon,
    aliases: ["h3"],
    run: (editor, range) =>
      at(editor, range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    description: "A simple bulleted list",
    icon: BulletListIcon,
    aliases: ["ul", "unordered", "bullet"],
    run: (editor, range) => at(editor, range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    description: "A list with ordering",
    icon: OrderedListIcon,
    aliases: ["ol", "ordered", "number"],
    run: (editor, range) => at(editor, range).toggleOrderedList().run(),
  },
  {
    title: "To-do list",
    description: "Track tasks with checkboxes",
    icon: TaskListIcon,
    aliases: ["todo", "task", "checkbox", "checklist"],
    run: (editor, range) => at(editor, range).toggleTaskList().run(),
  },
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
      const input = window.prompt("Paste a link URL");
      const url = input ? normalizeUrl(input) : null;
      if (url) insertLinkCard(editor, url);
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
