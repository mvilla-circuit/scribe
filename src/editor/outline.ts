import type { Editor } from "@tiptap/react";

// A single heading entry for the page outline. `pos` is the ProseMirror
// document position of the node, used to scroll to it without having to manage
// DOM ids. `essay` marks entries that come from an essay block's title rather
// than a real heading, so the outline can flag them; `icon` carries the essay's
// custom icon (when set) so the outline can render it in place of the default.
export type OutlineHeading = {
  pos: number;
  level: number;
  text: string;
  essay?: boolean;
  icon?: string | null;
};

// Walks the document in document order (which mirrors DOM order) collecting
// heading nodes (levels 1-3, per the editor's extension config) plus essay
// block titles. An essay's title lives on the node as an attribute rather than
// as a child heading, so it's pulled in explicitly; empty titles are skipped so
// they line up with the DOM, where an untitled essay renders no title element.
export function extractHeadings(editor: Editor): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "essay") {
      const title = ((node.attrs.title as string) ?? "").trim();
      if (title) {
        headings.push({
          pos,
          level: 1,
          text: title,
          essay: true,
          icon: (node.attrs.icon as string | null) ?? null,
        });
      }
      // Keep descending so headings inside the essay body are still listed.
      return true;
    }
    if (node.type.name === "heading") {
      headings.push({
        pos,
        level: (node.attrs.level as number) ?? 1,
        text: node.textContent,
      });
    }
    return true;
  });
  return headings;
}
