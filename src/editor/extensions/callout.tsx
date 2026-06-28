import { CALLOUT_DEFAULT } from "@/editor/palette";

import { CalloutView } from "./callout-view";
import { stringAttr } from "./data-attr";
import { dataDivBlock } from "./data-block";

// A tinted block that holds any other blocks (`block+`), fronted by an icon.
// Both the wash color and the icon live on the node as plain attributes so the
// callout round-trips through `documents.content` and the clipboard; the icon
// picker in `CalloutView` only ever calls updateAttributes. Both attrs are
// `always` emitted (empty when cleared) so a deliberately untinted/icon-less
// callout round-trips instead of falling back to its default on parse.
export const Callout = dataDivBlock({
  name: "callout",
  marker: "callout",
  group: "block",
  content: "block+",
  // `defining` keeps the callout intact when the selection is lifted/replaced,
  // so backspacing at the start of its first child doesn't dissolve the box.
  defining: true,
  attributes: () => ({
    color: stringAttr("color", {
      default: CALLOUT_DEFAULT.color,
      always: true,
    }),
    icon: stringAttr("icon", { default: CALLOUT_DEFAULT.icon, always: true }),
  }),
  view: CalloutView,
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
