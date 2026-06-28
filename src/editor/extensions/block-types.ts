import type { ChainedCommands } from "@tiptap/core";

import {
  BulletListIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  OrderedListIcon,
  TaskListIcon,
  TextIcon,
} from "@/editor/icons";
import type { IconProps } from "@/lib/make-icon";

/**
 * A basic block type shared by the slash menu and the block handle's "Turn
 * into" submenu. These are the textblock conversions that read and apply
 * identically in both places (same label, icon, and command), so they live in
 * one registry to keep the two menus in lockstep. Insert-only blocks (tables,
 * columns, callouts, page links, …) and conversions unique to one menu stay
 * defined alongside their menu.
 */
export interface BasicBlockType {
  title: string;
  description: string;
  icon: (props: IconProps) => React.ReactNode;
  aliases: string[];
  // Applies the conversion onto an already-focused command chain.
  command: (chain: ChainedCommands) => ChainedCommands;
}

export const BASIC_BLOCK_TYPES: BasicBlockType[] = [
  {
    title: "Text",
    description: "Plain paragraph",
    icon: TextIcon,
    aliases: ["paragraph", "p", "body"],
    command: (c) => c.setParagraph(),
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1Icon,
    aliases: ["h1", "title"],
    command: (c) => c.setNode("heading", { level: 1 }),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2Icon,
    aliases: ["h2", "subtitle"],
    command: (c) => c.setNode("heading", { level: 2 }),
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3Icon,
    aliases: ["h3"],
    command: (c) => c.setNode("heading", { level: 3 }),
  },
  {
    title: "Bulleted list",
    description: "A simple bulleted list",
    icon: BulletListIcon,
    aliases: ["ul", "unordered", "bullet"],
    command: (c) => c.toggleBulletList(),
  },
  {
    title: "Numbered list",
    description: "A list with ordering",
    icon: OrderedListIcon,
    aliases: ["ol", "ordered", "number"],
    command: (c) => c.toggleOrderedList(),
  },
  {
    title: "To-do list",
    description: "Track tasks with checkboxes",
    icon: TaskListIcon,
    aliases: ["todo", "task", "checkbox", "checklist"],
    command: (c) => c.toggleTaskList(),
  },
];
