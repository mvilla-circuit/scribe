import { describe, expect, it } from "vitest";

import {
  type DatagridCsvRow,
  parseDatagridCsv,
  serializeDatagridCsv,
} from "./datagrid-csv";
import type { DatagridField } from "./datagrid-schema";

const TEXT: DatagridField = {
  id: "f_text",
  name: "Notes",
  type: "text",
  config: {},
};
const NUM: DatagridField = {
  id: "f_num",
  name: "Score",
  type: "number",
  config: {},
};
const CHECK: DatagridField = {
  id: "f_check",
  name: "Done",
  type: "checkbox",
  config: {},
};
const STATUS: DatagridField = {
  id: "f_status",
  name: "Stage",
  type: "status",
  config: {
    options: [
      { id: "s_todo", name: "Todo", color: "gray" },
      { id: "s_done", name: "Done", color: "green" },
    ],
  },
};
const MULTI: DatagridField = {
  id: "f_multi",
  name: "Tags",
  type: "multi_select",
  config: {
    options: [
      { id: "t_a", name: "Alpha", color: "red" },
      { id: "t_b", name: "Beta", color: "blue" },
    ],
  },
};
const REL: DatagridField = {
  id: "f_rel",
  name: "Links",
  type: "relation",
  config: {},
};

function makeRow(
  title: string,
  properties: DatagridCsvRow["properties"] = {},
  times: { created_at?: string; updated_at?: string } = {},
): DatagridCsvRow {
  return {
    title,
    properties,
    created_at: times.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: times.updated_at ?? "2026-01-01T00:00:00.000Z",
  };
}

describe("serializeDatagridCsv", () => {
  it("writes a Title header plus one column per field", () => {
    const csv = serializeDatagridCsv([], [TEXT, NUM]);
    expect(csv).toBe("Title,Notes,Score");
  });

  it("serializes typed values with option names and joined arrays", () => {
    const rows = [
      makeRow("First", {
        f_text: "hi",
        f_num: 3,
        f_status: "s_done",
        f_multi: ["t_a", "t_b"],
      }),
    ];
    const csv = serializeDatagridCsv(rows, [TEXT, NUM, STATUS, MULTI]);
    expect(csv.split("\n")).toEqual([
      "Title,Notes,Score,Stage,Tags",
      "First,hi,3,Done,Alpha;Beta",
    ]);
  });

  it("serializes checkbox as true/false and relations as type:id", () => {
    const rows = [
      makeRow("R", {
        f_check: true,
        f_rel: [
          { type: "datagrid_row", id: "r1" },
          { type: "book", id: "b2" },
        ],
      }),
    ];
    const csv = serializeDatagridCsv(rows, [CHECK, REL]);
    expect(csv.split("\n")[1]).toBe("R,true,datagrid_row:r1;book:b2");
  });

  it("quotes values containing commas, quotes, or newlines", () => {
    const rows = [makeRow('Hello, "world"', { f_text: "line1\nline2" })];
    const csv = serializeDatagridCsv(rows, [TEXT]);
    expect(csv.split("\n").slice(0, 1)).toEqual(["Title,Notes"]);
    expect(csv).toContain('"Hello, ""world"""');
    expect(csv).toContain('"line1\nline2"');
  });
});

describe("parseDatagridCsv", () => {
  it("errors when the Title column is missing", () => {
    const result = parseDatagridCsv("Notes,Score\nhi,3", [TEXT, NUM]);
    expect(result.rows).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/title/i);
  });

  it("parses titles and typed properties, mapping columns by field name", () => {
    const csv = ["Title,Notes,Score", "First,hi,3", "Second,,7"].join("\n");
    const result = parseDatagridCsv(csv, [TEXT, NUM]);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { title: "First", properties: { f_text: "hi", f_num: 3 } },
      { title: "Second", properties: { f_text: null, f_num: 7 } },
    ]);
  });

  it("reports an error and skips a row with a blank title", () => {
    const csv = ["Title,Score", "  ,5", "Ok,6"].join("\n");
    const result = parseDatagridCsv(csv, [NUM]);
    expect(result.rows).toEqual([{ title: "Ok", properties: { f_num: 6 } }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ row: 1, column: "Title" });
  });

  it("reports a clear error for an invalid number", () => {
    const csv = ["Title,Score", "A,notnum"].join("\n");
    const result = parseDatagridCsv(csv, [NUM]);
    expect(result.rows[0]?.properties.f_num).toBeNull();
    expect(result.errors[0]).toMatchObject({ row: 1, column: "Score" });
    expect(result.errors[0]?.message).toMatch(/number/i);
  });

  it("resolves select/status option names back to ids", () => {
    const csv = ["Title,Stage", "A,Done", "B,Todo"].join("\n");
    const result = parseDatagridCsv(csv, [STATUS]);
    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => r.properties.f_status)).toEqual([
      "s_done",
      "s_todo",
    ]);
  });

  it("errors on an unknown select option", () => {
    const csv = ["Title,Stage", "A,Nope"].join("\n");
    const result = parseDatagridCsv(csv, [STATUS]);
    expect(result.rows[0]?.properties.f_status).toBeNull();
    expect(result.errors[0]).toMatchObject({ row: 1, column: "Stage" });
  });

  it("splits multi_select on semicolons and resolves each name", () => {
    const csv = ["Title,Tags", "A,Alpha;Beta"].join("\n");
    const result = parseDatagridCsv(csv, [MULTI]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.properties.f_multi).toEqual(["t_a", "t_b"]);
  });

  it("parses checkboxes from common truthy/falsey tokens", () => {
    const csv = ["Title,Done", "A,true", "B,no", "C,"].join("\n");
    const result = parseDatagridCsv(csv, [CHECK]);
    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => r.properties.f_check)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("parses relation refs of the form type:id joined by semicolons", () => {
    const csv = ["Title,Links", "A,datagrid_row:r1;book:b2"].join("\n");
    const result = parseDatagridCsv(csv, [REL]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.properties.f_rel).toEqual([
      { type: "datagrid_row", id: "r1" },
      { type: "book", id: "b2" },
    ]);
  });

  it("trims whitespace around relation type and id tokens", () => {
    const csv = ["Title,Links", "A, book :  b1 "].join("\n");
    const result = parseDatagridCsv(csv, [REL]);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]?.properties.f_rel).toEqual([
      { type: "book", id: "b1" },
    ]);
  });

  it("errors on a relation with an unknown target type", () => {
    const csv = ["Title,Links", "A,widget:x1"].join("\n");
    const result = parseDatagridCsv(csv, [REL]);
    expect(result.rows[0]?.properties.f_rel).toEqual([]);
    expect(result.errors[0]).toMatchObject({ row: 1, column: "Links" });
  });

  it("round-trips serialize -> parse", () => {
    const rows = [
      makeRow("First", {
        f_text: "hi",
        f_num: 3,
        f_status: "s_done",
        f_multi: ["t_a"],
      }),
    ];
    const fields = [TEXT, NUM, STATUS, MULTI];
    const csv = serializeDatagridCsv(rows, fields);
    const parsed = parseDatagridCsv(csv, fields);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      {
        title: "First",
        properties: {
          f_text: "hi",
          f_num: 3,
          f_status: "s_done",
          f_multi: ["t_a"],
        },
      },
    ]);
  });

  it("handles quoted fields with embedded commas and newlines", () => {
    const csv = 'Title,Notes\n"Hello, world","a\nb"';
    const result = parseDatagridCsv(csv, [TEXT]);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { title: "Hello, world", properties: { f_text: "a\nb" } },
    ]);
  });

  it("ignores unknown columns and read-only time columns on import", () => {
    const csv = ["Title,Unknown,Notes", "A,junk,keep"].join("\n");
    const result = parseDatagridCsv(csv, [TEXT]);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { title: "A", properties: { f_text: "keep" } },
    ]);
  });
});
