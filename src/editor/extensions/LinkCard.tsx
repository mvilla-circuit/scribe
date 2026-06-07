import { Node, mergeAttributes } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import { toast } from "sonner";
import { isBareUrl, normalizeUrl } from "../linkPreview";
import { LinkCardView } from "./LinkCardView";

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
        parseHTML: (el) => el.getAttribute("data-url") ?? el.getAttribute("href"),
        renderHTML: (attrs) =>
          attrs.url ? { href: attrs.url, "data-url": attrs.url } : {},
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
      description: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-description"),
        renderHTML: (attrs) =>
          attrs.description ? { "data-description": attrs.description } : {},
      },
      siteName: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-site-name"),
        renderHTML: (attrs) =>
          attrs.siteName ? { "data-site-name": attrs.siteName } : {},
      },
      favicon: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-favicon"),
        renderHTML: (attrs) =>
          attrs.favicon ? { "data-favicon": attrs.favicon } : {},
      },
      image: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-image"),
        renderHTML: (attrs) =>
          attrs.image ? { "data-image": attrs.image } : {},
      },
      status: {
        default: "ready",
        parseHTML: (el) => el.getAttribute("data-status") ?? "ready",
        renderHTML: (attrs) =>
          attrs.status ? { "data-status": attrs.status } : {},
      },
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
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (!isBareUrl(text)) return false;
            const { selection } = view.state;
            const { $from, empty } = selection;
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

            toast("Added bookmark", {
              action: {
                label: "Keep as link",
                onClick: () => keepAsLink(editor, url),
              },
            });
            return true;
          },
        },
      }),
    ];
  },
});

// Inserts a fresh bookmark card for `url`, kicking off the metadata fetch.
export function insertLinkCard(editor: Editor, url: string) {
  editor
    .chain()
    .focus()
    .insertContent({ type: "linkCard", attrs: { url, status: "loading" } })
    .run();
}

// Replaces the first link card pointing at `url` with a plain inline link, used
// by the "Keep as link" / "Convert to link" affordances.
export function keepAsLink(editor: Editor, url: string) {
  let found: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "linkCard" && node.attrs.url === url) {
      found = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return true;
  });
  if (!found) return;
  editor
    .chain()
    .focus()
    .insertContentAt(found, {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: url,
          marks: [{ type: "link", attrs: { href: url } }],
        },
      ],
    })
    .run();
}
