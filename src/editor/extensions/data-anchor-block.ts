import {
  type Attributes,
  type Editor,
  mergeAttributes,
  Node,
} from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

// The shared skeleton for the editor's `<a data-*>` block link cards (the
// external bookmark `linkCard` and the internal `pageLink`). Each is a
// draggable atom block that round-trips as a single marker `<a data-<marker>>`
// — degrading to a plain link in exported HTML — and renders through a React
// NodeView. The only things that vary are the attributes, the extra anchor
// attributes (href/target/rel), the export text, the view, and the paste
// handler, so this factory captures the identical schema/parse/render/node-view
// boilerplate and each node file declares only what makes it different.

type DataBlockView = Parameters<typeof ReactNodeViewRenderer>[0];

interface DataAnchorBlockOptions {
  /** ProseMirror node name. */
  name: string;
  /** Marker attribute: rendered as `data-<marker>=""`, parsed from `a[data-<marker>]`. */
  marker: string;
  /** The node's Tiptap attribute specs (typically built from data-attr helpers). */
  attributes: () => Attributes;
  /** Extra attributes merged onto the rendered `<a>` (e.g. href / target / rel). */
  renderAttrs?: (node: PMNode) => Record<string, string>;
  /** The anchor's text content — the export/clipboard fallback label. */
  text: (node: PMNode) => string;
  /** React NodeView component. */
  view: DataBlockView;
  /** ProseMirror paste plugins (the bare-URL / page-ref recognizers). */
  plugins?: (editor: Editor) => Plugin[];
}

/** Builds an `<a data-*>` atom block node from the parts that vary between cards. */
export function dataAnchorBlock(options: DataAnchorBlockOptions) {
  const marker = `data-${options.marker}`;
  return Node.create({
    name: options.name,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes() {
      return options.attributes();
    },
    parseHTML() {
      return [{ tag: `a[${marker}]` }];
    },
    renderHTML({ node, HTMLAttributes }) {
      return [
        "a",
        mergeAttributes(HTMLAttributes, {
          [marker]: "",
          ...options.renderAttrs?.(node),
        }),
        options.text(node),
      ];
    },
    addNodeView() {
      return ReactNodeViewRenderer(options.view);
    },
    addProseMirrorPlugins() {
      return options.plugins?.(this.editor) ?? [];
    },
  });
}
