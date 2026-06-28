import type { Editor } from "@tiptap/core";

import { dataAnchorBlock } from "./data-anchor-block";
import { stringAttr } from "./data-attr";
import { PageLinkView } from "./page-link-view";
import { pageRef, type PageTargetType } from "./page-ref";
import { pastePlugin } from "./paste-plugin";

// Matches an internal page reference like `scribe://page/<uuid>` (or `book/`).
const PAGE_REF = /^scribe:\/\/(page|book)\/([0-9a-fA-F-]{36})$/;

// An internal page link card. Unlike LinkCard it caches no title as source of
// truth — only a stale `label` fallback — and always live-resolves the current
// title/icon/breadcrumb from the local page index, so renaming the target
// updates the card everywhere.
export const PageLink = dataAnchorBlock({
  name: "pageLink",
  marker: "page-link",
  attributes: () => ({
    targetType: stringAttr("targetType", {
      default: "document",
      always: true,
    }),
    targetId: stringAttr("targetId"),
    label: stringAttr("label"),
  }),
  renderAttrs: (node) => {
    const targetType = (node.attrs.targetType as PageTargetType) ?? "document";
    const targetId = node.attrs.targetId as string | null;
    return { href: targetId ? pageRef(targetType, targetId) : "#" };
  },
  text: (node) => (node.attrs.label as string) || "Untitled page",
  view: PageLinkView,
  // Pasting a `scribe://page/<id>` ref inserts a page card.
  plugins: (editor) => [
    pastePlugin(editor, (text, ed) => {
      const match = PAGE_REF.exec(text.trim());
      if (!match) return false;
      const targetId = match[2];
      if (!targetId) return false;
      const targetType: PageTargetType =
        match[1] === "book" ? "book" : "document";
      insertPageLink(ed, { targetType, targetId });
      return true;
    }),
  ],
});

export function insertPageLink(
  editor: Editor,
  attrs: {
    targetType: PageTargetType;
    targetId: string;
    label?: string | null;
  },
) {
  editor.chain().focus().insertContent({ type: "pageLink", attrs }).run();
}
