import { Editor, type JSONContent } from "@tiptap/core";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it } from "vitest";

import { CALLOUT_DEFAULT } from "@/editor/palette";

import {
  convertBlock,
  CONVERTIBLE_SOURCES,
  extractLines,
  rebuildBlock,
  sourceTypeId,
} from "./block-convert";
import { Callout } from "./callout";
import { Quote } from "./quote";

// --- JSON builders -----------------------------------------------------------

function text(value: string, marks?: JSONContent["marks"]): JSONContent {
  return marks
    ? { type: "text", text: value, marks }
    : { type: "text", text: value };
}

function para(...inline: JSONContent[]): JSONContent {
  return inline.length
    ? { type: "paragraph", content: inline }
    : { type: "paragraph" };
}

function listItem(value: string): JSONContent {
  return { type: "listItem", content: [para(text(value))] };
}

function bulletList(values: string[]): JSONContent {
  return { type: "bulletList", content: values.map(listItem) };
}

// --- Pure: extractLines + rebuildBlock ---------------------------------------

describe("rebuildBlock", () => {
  it("rebuildBlock preserves inline marks into a heading", () => {
    const line = [text("hi", [{ type: "bold" }])];
    expect(rebuildBlock([line], "h2")).toEqual([
      {
        type: "heading",
        attrs: { level: 2 },
        content: [text("hi", [{ type: "bold" }])],
      },
    ]);
  });

  it("list source becomes one paragraph per item", () => {
    const lines = extractLines(bulletList(["a", "b", "c"]));
    expect(lines).toHaveLength(3);
    expect(rebuildBlock(lines, "text")).toEqual([
      para(text("a")),
      para(text("b")),
      para(text("c")),
    ]);
  });

  it("bulleted list converts to numbered list", () => {
    const lines = extractLines(bulletList(["a", "b"]));
    expect(rebuildBlock(lines, "orderedList")).toEqual({
      type: "orderedList",
      content: [listItem("a"), listItem("b")],
    });
  });

  it("callout unwraps to paragraphs without metadata", () => {
    const callout: JSONContent = {
      type: "callout",
      attrs: { color: "var(--swatch-1)", icon: "star" },
      content: [para(text("a")), para(text("b"))],
    };
    const lines = extractLines(callout);
    expect(lines).toHaveLength(2);
    expect(rebuildBlock(lines, "text")).toEqual([
      para(text("a")),
      para(text("b")),
    ]);
  });

  it("quote variant flips between pull and accent", () => {
    const quote: JSONContent = {
      type: "quote",
      attrs: { variant: "pullquote", attribution: "x" },
      content: [para(text("a"))],
    };
    expect(rebuildBlock(extractLines(quote), "accentquote")).toEqual({
      type: "quote",
      attrs: { variant: "accentquote" },
      content: [para(text("a"))],
    });
  });

  it("code target joins lines and strips marks", () => {
    const lines = [[text("a", [{ type: "bold" }])], [text("b")]];
    expect(rebuildBlock(lines, "code")).toEqual({
      type: "codeBlock",
      content: [text("a\nb")],
    });
  });

  it("paragraph wraps into a default callout", () => {
    const lines = extractLines(para(text("hi")));
    expect(rebuildBlock(lines, "callout")).toEqual({
      type: "callout",
      attrs: { color: CALLOUT_DEFAULT.color, icon: CALLOUT_DEFAULT.icon },
      content: [para(text("hi"))],
    });
  });

  it("multi-line source becomes one heading per line", () => {
    const lines = extractLines(bulletList(["a", "b"]));
    expect(rebuildBlock(lines, "h1")).toEqual([
      { type: "heading", attrs: { level: 1 }, content: [text("a")] },
      { type: "heading", attrs: { level: 1 }, content: [text("b")] },
    ]);
  });
});

// --- Source identification ---------------------------------------------------

describe("CONVERTIBLE_SOURCES", () => {
  it("includes every convertible source and excludes structural blocks", () => {
    for (const name of [
      "paragraph",
      "heading",
      "bulletList",
      "orderedList",
      "taskList",
      "quote",
      "callout",
      "codeBlock",
    ]) {
      expect(CONVERTIBLE_SOURCES.has(name)).toBe(true);
    }
    for (const name of [
      "horizontalRule",
      "table",
      "linkCard",
      "pageLink",
      "essay",
      "columns",
    ]) {
      expect(CONVERTIBLE_SOURCES.has(name)).toBe(false);
    }
  });
});

// --- Editor-level: convertBlock + sourceTypeId -------------------------------

let editor: Editor;

function mountDoc(content: JSONContent[]): Editor {
  editor = new Editor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Quote,
      Callout,
    ],
    content: { type: "doc", content },
  });
  return editor;
}

afterEach(() => {
  editor?.destroy();
});

describe("sourceTypeId", () => {
  it("maps quote variant and heading level to target ids", () => {
    mountDoc([
      {
        type: "quote",
        attrs: { variant: "pullquote" },
        content: [para(text("a"))],
      },
    ]);
    expect(sourceTypeId(editor.state.doc.nodeAt(0)!)).toBe("pullquote");

    mountDoc([{ type: "heading", attrs: { level: 2 }, content: [text("a")] }]);
    expect(sourceTypeId(editor.state.doc.nodeAt(0)!)).toBe("h2");
  });
});

describe("convertBlock", () => {
  it("convertBlock replaces a wrapper source (quote -> text)", () => {
    mountDoc([
      {
        type: "quote",
        attrs: { variant: "accentquote" },
        content: [para(text("hello"))],
      },
    ]);
    convertBlock(editor, 0, "text");
    const json = editor.getJSON();
    expect(json.content?.[0]?.type).toBe("paragraph");
    expect(json.content?.some((n) => n.type === "quote")).toBe(false);
  });

  it("convertBlock replaces a list source (bulleted -> H1)", () => {
    mountDoc([bulletList(["a", "b"])]);
    convertBlock(editor, 0, "h1");
    const json = editor.getJSON();
    expect(json.content?.filter((n) => n.type === "heading")).toHaveLength(2);
    expect(json.content?.some((n) => n.type === "bulletList")).toBe(false);
  });

  it("convertBlock is a no-op for the current type", () => {
    mountDoc([para(text("hi"))]);
    const before = editor.getJSON();
    convertBlock(editor, 0, "text");
    expect(editor.getJSON()).toEqual(before);
  });
});
