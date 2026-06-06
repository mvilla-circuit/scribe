import type { Editor } from "@tiptap/react";

// A single heading entry for the page outline. `pos` is the ProseMirror
// document position of the heading node, used to scroll to it without having to
// manage DOM ids.
export type OutlineHeading = {
  pos: number;
  level: number;
  text: string;
};

// Walks the document for heading nodes (levels 1-3, per the editor's extension
// config) in document order, which mirrors their DOM order.
export function extractHeadings(editor: Editor): OutlineHeading[] {
  const headings: OutlineHeading[] = [];
  editor.state.doc.descendants((node, pos) => {
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
