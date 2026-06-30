import type { JSONContent } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

import {
  BulletListIcon,
  CalloutIcon,
  CodeBlockIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  OrderedListIcon,
  PullQuoteIcon,
  QuoteIcon,
  TaskListIcon,
  TextIcon,
} from "@/editor/icons";
import { CALLOUT_DEFAULT } from "@/editor/palette";
import type { IconProps } from "@/lib/make-icon";

// A uniform, content-preserving "Turn into" system. Rather than lean on the
// command primitives (setNode / toggleList / wrapIn), which only act on the
// textblock under the caret and so can't convert a wrapper like quote/callout,
// every conversion normalizes the source to an ordered list of inline "lines"
// and rebuilds the target from them. This mirrors the JSON-rebuild approach used
// by the columns reshape in `block-actions.ts`, keeps marks intact, and makes
// the rebuild logic pure and unit-testable.

/** A single logical line: the inline content (text + marks) of one paragraph. */
export type Line = JSONContent[];

/** Identifier for a "Turn into" target, also used to mark the current type. */
export type ConvertTargetId =
  | "text"
  | "h1"
  | "h2"
  | "h3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "pullquote"
  | "accentquote"
  | "callout"
  | "code";

/** A "Turn into" target: its menu metadata plus how it builds from lines. */
export interface ConvertTarget {
  id: ConvertTargetId;
  label: string;
  icon: (props: IconProps) => React.ReactNode;
  build: (lines: Line[]) => JSONContent | JSONContent[];
}

/** Node type names that expose a "Turn into" menu. */
export const CONVERTIBLE_SOURCES: ReadonlySet<string> = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "taskList",
  "quote",
  "callout",
  "codeBlock",
]);

function paragraphOf(line: Line): JSONContent {
  return line.length
    ? { type: "paragraph", content: line }
    : { type: "paragraph" };
}

function headingOf(line: Line, level: number): JSONContent {
  const base = { type: "heading", attrs: { level } };
  return line.length ? { ...base, content: line } : base;
}

function listItemOf(line: Line, type: string): JSONContent {
  return { type, content: [paragraphOf(line)] };
}

function taskItemOf(line: Line): JSONContent {
  return {
    type: "taskItem",
    attrs: { checked: false },
    content: [paragraphOf(line)],
  };
}

function lineToText(line: Line): string {
  return line
    .map((node) => (node.type === "text" ? (node.text ?? "") : ""))
    .join("");
}

function quoteTarget(variant: string): (lines: Line[]) => JSONContent {
  return (lines) => ({
    type: "quote",
    attrs: { variant },
    content: lines.map(paragraphOf),
  });
}

/**
 * The "Turn into" targets, in menu order. Quotes are split into their two
 * variants (pull / accent) and a Callout target is included, matching the slash
 * menu's vocabulary.
 */
export const CONVERT_TARGETS: ConvertTarget[] = [
  {
    id: "text",
    label: "Text",
    icon: TextIcon,
    build: (lines) => lines.map(paragraphOf),
  },
  {
    id: "h1",
    label: "Heading 1",
    icon: Heading1Icon,
    build: (lines) => lines.map((line) => headingOf(line, 1)),
  },
  {
    id: "h2",
    label: "Heading 2",
    icon: Heading2Icon,
    build: (lines) => lines.map((line) => headingOf(line, 2)),
  },
  {
    id: "h3",
    label: "Heading 3",
    icon: Heading3Icon,
    build: (lines) => lines.map((line) => headingOf(line, 3)),
  },
  {
    id: "bulletList",
    label: "Bulleted list",
    icon: BulletListIcon,
    build: (lines) => ({
      type: "bulletList",
      content: lines.map((line) => listItemOf(line, "listItem")),
    }),
  },
  {
    id: "orderedList",
    label: "Numbered list",
    icon: OrderedListIcon,
    build: (lines) => ({
      type: "orderedList",
      content: lines.map((line) => listItemOf(line, "listItem")),
    }),
  },
  {
    id: "taskList",
    label: "To-do list",
    icon: TaskListIcon,
    build: (lines) => ({ type: "taskList", content: lines.map(taskItemOf) }),
  },
  {
    id: "pullquote",
    label: "Pull quote",
    icon: PullQuoteIcon,
    build: quoteTarget("pullquote"),
  },
  {
    id: "accentquote",
    label: "Accent quote",
    icon: QuoteIcon,
    build: quoteTarget("accentquote"),
  },
  {
    id: "callout",
    label: "Callout",
    icon: CalloutIcon,
    build: (lines) => ({
      type: "callout",
      attrs: { color: CALLOUT_DEFAULT.color, icon: CALLOUT_DEFAULT.icon },
      content: lines.map(paragraphOf),
    }),
  },
  {
    id: "code",
    label: "Code block",
    icon: CodeBlockIcon,
    build: (lines) => {
      const value = lines.map(lineToText).join("\n");
      return value
        ? { type: "codeBlock", content: [{ type: "text", text: value }] }
        : { type: "codeBlock" };
    },
  },
];

/**
 * Normalize a block node (as JSON) into the ordered inline lines it contains.
 * Textblocks yield one line; code blocks split on newlines; lists and wrapper
 * containers (quote/callout) recurse so their children flatten into lines, with
 * marks carried through untouched.
 */
export function extractLines(node: JSONContent): Line[] {
  const children = Array.isArray(node.content) ? node.content : [];
  switch (node.type) {
    case "paragraph":
    case "heading":
      return [Array.isArray(node.content) ? node.content : []];
    case "codeBlock":
      return lineToText(children)
        .split("\n")
        .map((value) => (value ? [{ type: "text", text: value }] : []));
    case "bulletList":
    case "orderedList":
    case "taskList":
      // Each item holds blocks (a paragraph, maybe nested lists); flatten them.
      return children.flatMap((item) =>
        (Array.isArray(item.content) ? item.content : []).flatMap(extractLines),
      );
    default:
      // Wrapper containers (quote, callout, …) recurse into their block children.
      return children.flatMap(extractLines);
  }
}

/** Build the target block JSON from extracted lines (one or more blocks). */
export function rebuildBlock(
  lines: Line[],
  targetId: ConvertTargetId,
): JSONContent | JSONContent[] {
  const target = CONVERT_TARGETS.find((t) => t.id === targetId);
  if (!target) return lines.map(paragraphOf);
  return target.build(lines.length ? lines : [[]]);
}

/** The target id matching a live node's current type/variant, or null. */
export function sourceTypeId(node: PMNode): ConvertTargetId | null {
  switch (node.type.name) {
    case "paragraph":
      return "text";
    case "heading": {
      const level = Number(node.attrs.level) || 1;
      return `h${Math.min(3, Math.max(1, level))}` as ConvertTargetId;
    }
    case "bulletList":
      return "bulletList";
    case "orderedList":
      return "orderedList";
    case "taskList":
      return "taskList";
    case "quote":
      return node.attrs.variant === "pullquote" ? "pullquote" : "accentquote";
    case "callout":
      return "callout";
    case "codeBlock":
      return "code";
    default:
      return null;
  }
}

/**
 * Convert the block at `pos` into `targetId`, preserving its text content. Reads
 * the live node, rebuilds it from extracted lines, and replaces its range in a
 * single transaction with the caret landing in the first rebuilt block. A no-op
 * when the block is already the target type/variant.
 */
export function convertBlock(
  editor: Editor,
  pos: number,
  targetId: ConvertTargetId,
) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node || sourceTypeId(node) === targetId) return;
  const built = rebuildBlock(extractLines(node.toJSON()), targetId);
  editor
    .chain()
    .focus()
    .insertContentAt({ from: pos, to: pos + node.nodeSize }, built)
    .setTextSelection(pos + 1)
    .run();
}
