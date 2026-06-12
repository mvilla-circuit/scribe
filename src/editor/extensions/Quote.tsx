import { Node, mergeAttributes, wrappingInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { QuoteView } from "./QuoteView";

export type QuoteVariant = "pullquote" | "blockquote" | "accentquote";

export const QUOTE_VARIANTS: QuoteVariant[] = [
  "pullquote",
  "blockquote",
  "accentquote",
];

const DEFAULT_VARIANT: QuoteVariant = "blockquote";

// A quotation block with three visual treatments (pullquote / blockquote /
// accentquote). The variant, an optional accent color, and a plain-text
// attribution line all live as node attributes so the quote round-trips through
// `documents.content` and the clipboard; the controls in `QuoteView` only ever
// call updateAttributes. A single solid `color` drives every variant — CSS
// derives each variant's intensity from it via color-mix.
export const Quote = Node.create({
  name: "quote",
  group: "block",
  content: "paragraph+",
  // Keep the quote intact when the selection is lifted/replaced, so backspacing
  // at the start of its first paragraph doesn't dissolve the block.
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: DEFAULT_VARIANT,
        parseHTML: (el) => el.getAttribute("data-variant") ?? DEFAULT_VARIANT,
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
      color: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-color"),
        renderHTML: (attrs) =>
          attrs.color ? { "data-color": attrs.color } : {},
      },
      attribution: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-attribution") ?? "",
        renderHTML: (attrs) =>
          attrs.attribution ? { "data-attribution": attrs.attribution } : {},
      },
      showAttribution: {
        default: false,
        parseHTML: (el) => el.getAttribute("data-show-attribution") === "true",
        renderHTML: (attrs) =>
          attrs.showAttribution ? { "data-show-attribution": "true" } : {},
      },
    };
  },

  parseHTML() {
    // `blockquote` is parsed too so pasted HTML and legacy markup land as quotes.
    return [{ tag: "div[data-quote]" }, { tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-quote": "" }), 0];
  },

  addInputRules() {
    // Typing "> " at the start of a paragraph wraps it into the default
    // (blockquote) variant, preserving the familiar markdown shortcut.
    return [
      wrappingInputRule({
        find: /^\s*>\s$/,
        type: this.type,
        getAttributes: () => ({ variant: DEFAULT_VARIANT }),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteView);
  },
});

// Starter content for a fresh quote: the chosen variant wrapping one empty
// paragraph the caret lands in.
export function quoteContent(variant: QuoteVariant) {
  return {
    type: Quote.name,
    attrs: { variant },
    content: [{ type: "paragraph" }],
  };
}
