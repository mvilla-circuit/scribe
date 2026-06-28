import {
  type Attributes,
  type InputRule,
  mergeAttributes,
  Node,
} from "@tiptap/core";
import type { NodeType } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";

// The shared skeleton for the editor's `<div data-*>` block nodes (callout,
// quote, essay, columns, column). Each is a ProseMirror node that round-trips as
// a single marker `<div data-<marker>>` and renders through a React NodeView;
// the only things that vary are the schema shape (content/group/defining/…), the
// attributes, optional input rules, and the view. This factory captures the
// identical parse/render/node-view boilerplate so each node file declares only
// what makes it different.

type DataBlockView = Parameters<typeof ReactNodeViewRenderer>[0];

interface DataDivBlockOptions {
  /** ProseMirror node name. */
  name: string;
  /** Marker attribute: rendered as `data-<marker>=""`, parsed from `div[data-<marker>]`. */
  marker: string;
  /** Content expression (e.g. `"block+"`). */
  content?: string;
  /** Schema group (`"block"` for top-level blocks; omitted for `column`). */
  group?: string;
  /** Keep the node intact when its content is lifted/replaced. */
  defining?: boolean;
  /** Stop edits inside the node from escaping/merging with siblings. */
  isolating?: boolean;
  /** Extra parse rules appended after `div[data-<marker>]` (e.g. legacy `blockquote`). */
  extraParseRules?: { tag: string }[];
  /** The node's Tiptap attribute specs (typically built from data-attr helpers). */
  attributes?: () => Attributes;
  /** Input rules, given the resolved node type (e.g. the quote's `> ` shortcut). */
  inputRules?: (type: NodeType) => InputRule[];
  /** React NodeView component. */
  view: DataBlockView;
}

/** Builds a `<div data-*>` block node from the parts that vary between blocks. */
export function dataDivBlock(options: DataDivBlockOptions) {
  const marker = `data-${options.marker}`;
  return Node.create({
    name: options.name,
    group: options.group,
    content: options.content,
    defining: options.defining,
    isolating: options.isolating,
    addAttributes() {
      return options.attributes?.() ?? {};
    },
    parseHTML() {
      return [{ tag: `div[${marker}]` }, ...(options.extraParseRules ?? [])];
    },
    renderHTML({ HTMLAttributes }) {
      return ["div", mergeAttributes(HTMLAttributes, { [marker]: "" }), 0];
    },
    addInputRules() {
      return options.inputRules?.(this.type) ?? [];
    },
    addNodeView() {
      return ReactNodeViewRenderer(options.view);
    },
  });
}
