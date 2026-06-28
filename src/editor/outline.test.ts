import { getSchema } from "@tiptap/core";
import type { Editor, JSONContent } from "@tiptap/react";
import { describe, expect, it } from "vitest";

import { buildExtensions } from "./extensions";
import { extractHeadings } from "./outline";

// extractHeadings only walks editor.state.doc, so we build a real ProseMirror
// document from the editor's own schema and hand the function a minimal
// editor-shaped stand-in. A fully mounted view isn't an option here: jsdom has
// no layout, so the Placeholder plugin's coordinate probing (elementFromPoint)
// throws during view creation.
const schema = getSchema(buildExtensions());

function headingsFromDoc(content: JSONContent[]) {
  const doc = schema.nodeFromJSON({ type: "doc", content });
  const fakeEditor = { state: { doc } };
  // eslint-disable-next-line no-restricted-syntax -- intentional test stand-in: extractHeadings reads only state.doc, and a real mounted Editor can't be created under jsdom (see note above).
  return extractHeadings(fakeEditor as unknown as Editor);
}

describe("extractHeadings", () => {
  it("collects headings (levels 1-3) in document order", () => {
    const headings = headingsFromDoc([
      { type: "heading", attrs: { level: 1 }, content: [text("Intro")] },
      { type: "heading", attrs: { level: 2 }, content: [text("Background")] },
      { type: "heading", attrs: { level: 3 }, content: [text("Detail")] },
    ]);

    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [1, "Intro"],
      [2, "Background"],
      [3, "Detail"],
    ]);
  });

  it("includes an essay's title (flagged, with its icon) and descends into its body", () => {
    const headings = headingsFromDoc([
      { type: "heading", attrs: { level: 1 }, content: [text("Top")] },
      {
        type: "essay",
        attrs: { title: "My Essay", icon: "📝" },
        content: [
          { type: "paragraph", content: [text("body")] },
          { type: "heading", attrs: { level: 3 }, content: [text("Inside")] },
        ],
      },
    ]);

    expect(headings.map((h) => h.text)).toEqual(["Top", "My Essay", "Inside"]);

    const essayEntry = headings.find((h) => h.text === "My Essay");
    expect(essayEntry?.essay).toBe(true);
    expect(essayEntry?.level).toBe(1);
    expect(essayEntry?.icon).toBe("📝");

    // A heading inside the essay body is a real heading, not an essay entry.
    expect(headings.find((h) => h.text === "Inside")?.essay).toBeUndefined();
  });

  it("skips an essay with an empty/whitespace title", () => {
    const headings = headingsFromDoc([
      {
        type: "essay",
        attrs: { title: "   " },
        content: [{ type: "paragraph", content: [text("body")] }],
      },
    ]);

    expect(headings).toEqual([]);
  });
});

function text(value: string): JSONContent {
  return { type: "text", text: value };
}
