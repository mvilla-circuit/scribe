import { Editor, getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { buildExtensions } from "@/editor/extensions";

import { CONVERTIBLE_SOURCES } from "./block-convert";
import { DatagridRowCard, insertDatagridRowCard } from "./datagrid-row-card";

describe("insertDatagridRowCard", () => {
  it("inserts a datagridRowCard atom with datagridId, rowId, and label", () => {
    const editor = new Editor({
      extensions: [StarterKit, DatagridRowCard],
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });

    insertDatagridRowCard(editor, {
      datagridId: "dg-1",
      rowId: "row-1",
      label: "Aria",
    });

    const json = editor.getJSON();
    const card = json.content?.find((node) => node.type === "datagridRowCard");
    expect(card?.attrs).toMatchObject({
      datagridId: "dg-1",
      rowId: "row-1",
      label: "Aria",
    });

    editor.destroy();
  });
});

describe("datagridRowCard in schema", () => {
  it("is registered on the default extension set and is not convertible", () => {
    const schema = getSchema(buildExtensions());
    expect(schema.nodes.datagridRowCard).toBeDefined();
    expect(CONVERTIBLE_SOURCES.has("datagridRowCard")).toBe(false);
  });
});
