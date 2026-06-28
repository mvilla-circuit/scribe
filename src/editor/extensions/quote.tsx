import { wrappingInputRule } from "@tiptap/core";

import { boolAttr, stringAttr } from "./data-attr";
import { dataDivBlock } from "./data-block";
import { QuoteView } from "./quote-view";

export type QuoteVariant = "pullquote" | "accentquote";

const DEFAULT_VARIANT: QuoteVariant = "accentquote";

// A quotation block with two visual treatments (pullquote / accentquote). The
// variant, an optional accent color, and a plain-text
// attribution line all live as node attributes so the quote round-trips through
// `documents.content` and the clipboard; the controls in `QuoteView` only ever
// call updateAttributes. A single solid `color` drives every variant — CSS
// derives each variant's intensity from it via color-mix.
export const Quote = dataDivBlock({
  name: "quote",
  marker: "quote",
  group: "block",
  // Paragraphs plus the list family, so quotes can hold bulleted / numbered /
  // task lists (and the `- `, `1. `, `[] ` input rules have somewhere to wrap
  // into) without opening the door to headings or nested blocks.
  content: "(paragraph | bulletList | orderedList | taskList)+",
  // Keep the quote intact when the selection is lifted/replaced, so backspacing
  // at the start of its first paragraph doesn't dissolve the block.
  defining: true,
  // `blockquote` is parsed too so pasted HTML and legacy markup land as quotes.
  extraParseRules: [{ tag: "blockquote" }],
  attributes: () => ({
    variant: stringAttr("variant", { default: DEFAULT_VARIANT, always: true }),
    color: stringAttr("color"),
    attribution: stringAttr("attribution", { default: "" }),
    showAttribution: boolAttr("showAttribution"),
  }),
  // Typing "> " at the start of a paragraph wraps it into the default (accent
  // quote) variant, preserving the familiar markdown shortcut.
  inputRules: (type) => [
    wrappingInputRule({
      find: /^\s*>\s$/,
      type,
      getAttributes: () => ({ variant: DEFAULT_VARIANT }),
    }),
  ],
  view: QuoteView,
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
