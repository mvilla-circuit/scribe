import { describe, expect, it } from "vitest";

import { DATAGRID_FIELD_TYPE_DEFS, fieldTypeDef } from "./datagrid-field-types";

describe("DATAGRID_FIELD_TYPE_DEFS", () => {
  it("defines the canonical label for every field type", () => {
    expect(
      DATAGRID_FIELD_TYPE_DEFS.map(({ type, label }) => [type, label]),
    ).toEqual([
      ["text", "Text"],
      ["number", "Number"],
      ["date", "Date"],
      ["select", "Select"],
      ["multi_select", "Multi-select"],
      ["status", "Status"],
      ["checkbox", "Checkbox"],
      ["url", "URL"],
      ["relation", "Relation"],
      ["created_time", "Created time"],
      ["updated_time", "Updated time"],
    ]);
  });

  it("seeds options only for option-backed field types", () => {
    expect(fieldTypeDef("select").defaultConfig).toEqual({ options: [] });
    expect(fieldTypeDef("multi_select").defaultConfig).toEqual({
      options: [],
    });
    expect(fieldTypeDef("status").defaultConfig).toEqual({ options: [] });
    expect(fieldTypeDef("text").defaultConfig).toEqual({});
  });
});
