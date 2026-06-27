import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";

import { CALLOUT_DEFAULT } from "../palette";
import { CalloutView } from "./CalloutView";

// A tinted block that holds any other blocks (`block+`), fronted by an icon.
// Both the wash color and the icon live on the node as plain attributes so the
// callout round-trips through `documents.content` and the clipboard; the icon
// picker in `CalloutView` only ever calls updateAttributes.
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  // `defining` keeps the callout intact when the selection is lifted/replaced,
  // so backspacing at the start of its first child doesn't dissolve the box.
  defining: true,

  addAttributes() {
    return {
      color: {
        default: CALLOUT_DEFAULT.color,
        parseHTML: (el) => el.getAttribute("data-color"),
        // Always emit `data-color` (empty when "no color" was chosen) so a
        // deliberately untinted callout round-trips through HTML/clipboard
        // instead of falling back to the default wash on parse.
        renderHTML: (attrs) => ({ "data-color": attrs.color ?? "" }),
      },
      icon: {
        default: CALLOUT_DEFAULT.icon,
        parseHTML: (el) => el.getAttribute("data-icon"),
        // Always emit `data-icon` (empty when the icon was removed) so a
        // deliberately icon-less callout round-trips through HTML/clipboard
        // instead of falling back to the default icon on parse.
        renderHTML: (attrs) => ({ "data-icon": attrs.icon ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-callout": "" }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

// The starter content a fresh callout is inserted with: the default variant
// wrapping a single empty paragraph the caret lands in.
export function calloutContent() {
  return {
    type: Callout.name,
    attrs: { color: CALLOUT_DEFAULT.color, icon: CALLOUT_DEFAULT.icon },
    content: [{ type: "paragraph" }],
  };
}
