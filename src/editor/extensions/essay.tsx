import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { boolAttr, stringAttr } from "./data-attr";
import { EssayView } from "./essay-view";

// A long-form section block: a header (optional icon, a title, an optional
// subtitle) sitting above a rich `block+` body, framed by horizontal accent
// rules. The header fields and the accent color all live on the node as plain
// attributes so the essay round-trips through `documents.content` and the
// clipboard; the controls in `EssayView` only ever call updateAttributes. A
// single solid `color` drives the accent rules, which CSS derives via color-mix
// (mirroring the quote block's `--quote-accent`).
export const Essay = Node.create({
  name: "essay",
  group: "block",
  content: "block+",
  // `defining` keeps the essay intact when the selection is lifted/replaced, so
  // backspacing at the start of its first child doesn't dissolve the block.
  defining: true,

  addAttributes() {
    return {
      title: stringAttr("title", { default: "" }),
      titleItalic: boolAttr("titleItalic"),
      subtitle: stringAttr("subtitle", { default: "" }),
      // Subtitle defaults to italic to preserve the essay's editorial look; the
      // writer can toggle it off (or the title on) with Cmd/Ctrl+I.
      subtitleItalic: boolAttr("subtitleItalic", { default: true }),
      showSubtitle: boolAttr("showSubtitle"),
      icon: stringAttr("icon"),
      color: stringAttr("color"),
    };
  },

  parseHTML() {
    return [{ tag: "div[data-essay]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-essay": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EssayView);
  },
});

// Starter content for a fresh essay: an empty header wrapping one empty
// paragraph the caret lands in.
export function essayContent() {
  return {
    type: Essay.name,
    attrs: {
      title: "",
      titleItalic: false,
      subtitle: "",
      subtitleItalic: true,
      showSubtitle: false,
      icon: null,
      color: null,
    },
    content: [{ type: "paragraph" }],
  };
}
