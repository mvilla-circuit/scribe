import { mergeAttributes, Node } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { type Editor, ReactNodeViewRenderer } from "@tiptap/react";

import { PageLinkView } from "./PageLinkView";
import { pageRef, type PageTargetType } from "./pageRef";

// Matches an internal page reference like `scribe://page/<uuid>` (or `book/`).
const PAGE_REF = /^scribe:\/\/(page|book)\/([0-9a-fA-F-]{36})$/;

// An internal page link card. Unlike LinkCard it caches no title as source of
// truth — only a stale `label` fallback — and always live-resolves the current
// title/icon/breadcrumb from the local page index, so renaming the target
// updates the card everywhere.
export const PageLink = Node.create({
  name: "pageLink",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      targetType: {
        default: "document",
        parseHTML: (el) => el.getAttribute("data-target-type") ?? "document",
        renderHTML: (attrs) => ({ "data-target-type": attrs.targetType }),
      },
      targetId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-target-id"),
        renderHTML: (attrs) =>
          attrs.targetId ? { "data-target-id": attrs.targetId } : {},
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-label"),
        renderHTML: (attrs) =>
          attrs.label ? { "data-label": attrs.label } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-page-link]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const targetType = (node.attrs.targetType as PageTargetType) ?? "document";
    const targetId = node.attrs.targetId as string | null;
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-page-link": "",
        href: targetId ? pageRef(targetType, targetId) : "#",
      }),
      (node.attrs.label as string) || "Untitled page",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageLinkView);
  },

  // Pasting a `scribe://page/<id>` ref inserts a page card.
  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const text = (
              event.clipboardData?.getData("text/plain") ?? ""
            ).trim();
            const match = PAGE_REF.exec(text);
            if (!match) return false;
            const targetId = match[2];
            if (!targetId) return false;
            const targetType: PageTargetType =
              match[1] === "book" ? "book" : "document";
            insertPageLink(editor, { targetType, targetId });
            return true;
          },
        },
      }),
    ];
  },
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
