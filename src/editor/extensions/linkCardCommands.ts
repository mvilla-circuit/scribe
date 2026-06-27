import type { Editor } from "@tiptap/react";

// Editor commands for link cards, kept in their own leaf module so the node
// definition and its node view can both invoke them without importing each
// other (which would form a circular dependency).

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
