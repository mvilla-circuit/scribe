import { mergeAttributes, Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { toast } from "sonner";

import { isBareUrl, normalizeUrl } from "@/editor/link-preview";

import { stringAttr } from "./data-attr";
import { keepAsLink } from "./link-card-commands";
import { LinkCardView } from "./link-card-view";
import { pastePlugin } from "./paste-plugin";

// An external bookmark: an atom block storing a URL plus cached page metadata.
// The metadata is fetched once (in the view) and written back onto the node, so
// the card persists into `documents.content` and re-renders instantly offline.
// In exported HTML it degrades to a plain <a> link.
export const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("data-url") ?? el.getAttribute("href"),
        renderHTML: (attrs) =>
          attrs.url ? { href: attrs.url, "data-url": attrs.url } : {},
      },
      title: stringAttr("title"),
      description: stringAttr("description"),
      siteName: stringAttr("siteName"),
      favicon: stringAttr("favicon"),
      image: stringAttr("image"),
      status: stringAttr("status", { default: "ready" }),
    };
  },

  parseHTML() {
    return [{ tag: "a[data-link-card]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-link-card": "",
        target: "_blank",
        rel: "noopener noreferrer",
      }),
      (node.attrs.title as string) || (node.attrs.url as string) || "Link",
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LinkCardView);
  },

  // Pasting a lone URL onto an empty paragraph turns it into a bookmark card,
  // with a transient "Keep as link" escape hatch.
  addProseMirrorPlugins() {
    return [
      pastePlugin(this.editor, (text, editor, view) => {
        if (!isBareUrl(text)) return false;
        const { $from, empty } = view.state.selection;
        const parent = $from.parent;
        const inEmptyParagraph =
          parent.type.name === "paragraph" && parent.content.size === 0;
        if (!empty || !inEmptyParagraph) return false;
        const url = normalizeUrl(text);
        if (!url) return false;

        editor
          .chain()
          .focus()
          .insertContent({
            type: "linkCard",
            attrs: { url, status: "loading" },
          })
          .run();

        toast.success("Added bookmark", {
          action: {
            label: "Keep as link",
            onClick: () => {
              keepAsLink(editor, url);
            },
          },
        });
        return true;
      }),
    ];
  },
});
