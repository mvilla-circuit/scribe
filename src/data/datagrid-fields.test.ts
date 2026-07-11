import { describe, expect, it } from "vitest";

import {
  type DatagridField,
  type DatagridFieldType,
  TITLE_FIELD_ID,
} from "@/lib/datagrid-schema";

import {
  addField,
  defaultFieldName,
  deleteField,
  newFieldFromType,
  reorderField,
  updateField,
} from "./datagrid-fields";

function field(
  id: string,
  overrides: Partial<DatagridField> = {},
): DatagridField {
  return { id, name: id, type: "text", config: {}, ...overrides };
}

describe("defaultFieldName", () => {
  it("defaultFieldName maps each field type", () => {
    const expectedNames: Record<DatagridFieldType, string> = {
      text: "Text",
      number: "Number",
      date: "Date",
      select: "Select",
      multi_select: "Multi-select",
      status: "Status",
      checkbox: "Checkbox",
      url: "URL",
      relation: "Relation",
      created_time: "Created time",
      updated_time: "Updated time",
    };

    for (const [type, name] of Object.entries(expectedNames)) {
      expect(defaultFieldName(type as DatagridFieldType)).toBe(name);
    }
  });
});

describe("newFieldFromType", () => {
  it.each<DatagridFieldType>(["select", "multi_select", "status"])(
    "initializes %s fields with empty options",
    (type) => {
      expect(newFieldFromType(type, "field-id")).toEqual({
        id: "field-id",
        name: defaultFieldName(type),
        type,
        config: { options: [] },
      });
    },
  );

  it.each<DatagridFieldType>([
    "text",
    "number",
    "date",
    "checkbox",
    "url",
    "relation",
    "created_time",
    "updated_time",
  ])("initializes %s fields with empty config", (type) => {
    expect(newFieldFromType(type, "field-id")).toEqual({
      id: "field-id",
      name: defaultFieldName(type),
      type,
      config: {},
    });
  });
});

describe("addField", () => {
  it("appends a field to the end", () => {
    const result = addField([field("a")], field("b"));
    expect(result.map((f) => f.id)).toEqual(["a", "b"]);
  });

  it("does not mutate the input array", () => {
    const fields = [field("a")];
    addField(fields, field("b"));
    expect(fields.map((f) => f.id)).toEqual(["a"]);
  });

  it("rejects a duplicate id", () => {
    expect(() => addField([field("a")], field("a"))).toThrow();
  });

  it("rejects the reserved title id", () => {
    expect(() => addField([], field(TITLE_FIELD_ID))).toThrow();
  });
});

describe("updateField", () => {
  it("merges a patch into the matching field", () => {
    const result = updateField([field("a"), field("b")], "b", {
      name: "Renamed",
      type: "number",
    });
    expect(result[1]).toMatchObject({
      id: "b",
      name: "Renamed",
      type: "number",
    });
    expect(result[0]).toMatchObject({ id: "a" });
  });

  it("never changes the field id", () => {
    const result = updateField([field("a")], "a", { id: "hacked" });
    expect(result[0]?.id).toBe("a");
  });

  it("leaves the list unchanged when no field matches", () => {
    const fields = [field("a")];
    expect(updateField(fields, "missing", { name: "x" })).toEqual(fields);
  });
});

describe("reorderField", () => {
  it("moves a field to a new index", () => {
    const fields = [field("a"), field("b"), field("c")];
    expect(reorderField(fields, "a", 2).map((f) => f.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("reorders a field after sortable drag end", () => {
    // DragEnd maps active → over by calling reorderField(activeId, overIndex).
    const fields = [field("a"), field("b"), field("c")];
    const overIndex = fields.findIndex((f) => f.id === "b");
    expect(reorderField(fields, "a", overIndex).map((f) => f.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("is a no-op for an unknown id", () => {
    const fields = [field("a"), field("b")];
    expect(reorderField(fields, "missing", 0)).toEqual(fields);
  });
});

describe("deleteField", () => {
  it("removes the matching field", () => {
    const result = deleteField([field("a"), field("b")], "a");
    expect(result.map((f) => f.id)).toEqual(["b"]);
  });

  it("rejects deleting the reserved title concept", () => {
    expect(() => deleteField([field("a")], TITLE_FIELD_ID)).toThrow();
  });
});
