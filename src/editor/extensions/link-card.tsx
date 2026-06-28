import { toast } from "sonner";

import { isBareUrl, normalizeUrl } from "@/editor/link-preview";

import { dataAnchorBlock } from "./data-anchor-block";
import { stringAttr } from "./data-attr";
import { insertLinkCard, keepAsLink } from "./link-card-commands";
import { LinkCardView } from "./link-card-view";
import { pastePlugin } from "./paste-plugin";

// An external bookmark: an atom block storing a URL plus cached page metadata.
// The metadata is fetched once (in the view) and written back onto the node, so
// the card persists into `documents.content` and re-renders instantly offline.
// In exported HTML it degrades to a plain <a> link.
export const LinkCard = dataAnchorBlock({
  name: "linkCard",
  marker: "link-card",
  attributes: () => ({
    url: {
      default: null,
      parseHTML: (el) => el.getAttribute("data-url") ?? el.getAttribute("href"),
      renderHTML: (attrs) =>
        attrs.url ? { href: attrs.url, "data-url": attrs.url } : {},
    },
    title: stringAttr("title"),
    description: stringAttr("description"),
    siteName: stringAttr("siteName"),
    favicon: stringAttr("favicon"),
    image: stringAttr("image"),
    status: stringAttr("status", { default: "ready" }),
  }),
  renderAttrs: () => ({ target: "_blank", rel: "noopener noreferrer" }),
  text: (node) =>
    (node.attrs.title as string) || (node.attrs.url as string) || "Link",
  view: LinkCardView,
  // Pasting a lone URL onto an empty paragraph turns it into a bookmark card,
  // with a transient "Keep as link" escape hatch.
  plugins: (editor) => [
    pastePlugin(editor, (text, ed, view) => {
      if (!isBareUrl(text)) return false;
      const { $from, empty } = view.state.selection;
      const parent = $from.parent;
      const inEmptyParagraph =
        parent.type.name === "paragraph" && parent.content.size === 0;
      if (!empty || !inEmptyParagraph) return false;
      const url = normalizeUrl(text);
      if (!url) return false;

      insertLinkCard(ed, url);

      toast.success("Added bookmark", {
        action: {
          label: "Keep as link",
          onClick: () => {
            keepAsLink(ed, url);
          },
        },
      });
      return true;
    }),
  ],
});
