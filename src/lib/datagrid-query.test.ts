import { describe, expect, it } from "vitest";

import {
  type DatagridQueryRow,
  filterRows,
  groupRows,
  queryDatagrid,
  sortRows,
  TITLE_FIELD_ID,
} from "./datagrid-query";
import type {
  DatagridField,
  DatagridFilter,
  DatagridSort,
} from "./datagrid-schema";

function makeRow(
  id: string,
  title: string,
  properties: DatagridQueryRow["properties"] = {},
  times: { created_at?: string; updated_at?: string } = {},
): DatagridQueryRow {
  return {
    id,
    title,
    properties,
    created_at: times.created_at ?? "2026-01-01T00:00:00.000Z",
    updated_at: times.updated_at ?? "2026-01-01T00:00:00.000Z",
  };
}

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
const DATE: DatagridField = {
  id: "f_date",
  name: "Due",
  type: "date",
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
      { id: "s_doing", name: "Doing", color: "blue" },
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
const CREATED: DatagridField = {
  id: "f_created",
  name: "Created",
  type: "created_time",
  config: {},
};

const FIELDS = [TEXT, NUM, DATE, CHECK, STATUS, MULTI, REL, CREATED];

describe("filterRows", () => {
  it("returns all rows when there are no filters", () => {
    const rows = [makeRow("1", "A"), makeRow("2", "B")];
    expect(filterRows(rows, [], FIELDS)).toEqual(rows);
  });

  it("filters on the title via the title sentinel field id", () => {
    const rows = [makeRow("1", "Apple"), makeRow("2", "Banana")];
    const filters: DatagridFilter[] = [
      { fieldId: TITLE_FIELD_ID, op: "contains", value: "ana" },
    ];
    expect(filterRows(rows, filters, FIELDS).map((r) => r.id)).toEqual(["2"]);
  });

  it("supports equals / not_equals on text", () => {
    const rows = [
      makeRow("1", "A", { f_text: "hello" }),
      makeRow("2", "B", { f_text: "world" }),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_text", op: "equals", value: "hello" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_text", op: "not_equals", value: "hello" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("does a case-insensitive contains / not_contains on text", () => {
    const rows = [
      makeRow("1", "A", { f_text: "Hello World" }),
      makeRow("2", "B", { f_text: "Goodbye" }),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_text", op: "contains", value: "world" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_text", op: "not_contains", value: "world" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("supports is_empty / is_not_empty across value shapes", () => {
    const rows = [
      makeRow("1", "A", { f_text: "x", f_multi: ["t_a"] }),
      makeRow("2", "B", { f_text: "", f_multi: [] }),
      makeRow("3", "C", {}),
    ];
    expect(
      filterRows(rows, [{ fieldId: "f_text", op: "is_empty" }], FIELDS).map(
        (r) => r.id,
      ),
    ).toEqual(["2", "3"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_multi", op: "is_not_empty" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
  });

  it("compares numbers with gt / gte / lt / lte", () => {
    const rows = [
      makeRow("1", "A", { f_num: 5 }),
      makeRow("2", "B", { f_num: 10 }),
      makeRow("3", "C", { f_num: 15 }),
    ];
    expect(
      filterRows(rows, [{ fieldId: "f_num", op: "gt", value: 5 }], FIELDS).map(
        (r) => r.id,
      ),
    ).toEqual(["2", "3"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_num", op: "gte", value: 10 }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2", "3"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_num", op: "lte", value: 10 }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1", "2"]);
  });

  it("compares dates with gt / lt", () => {
    const rows = [
      makeRow("1", "A", { f_date: "2026-01-01T00:00:00.000Z" }),
      makeRow("2", "B", { f_date: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_date", op: "gt", value: "2026-03-01T00:00:00.000Z" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("filters created_time from the row timestamp", () => {
    const rows = [
      makeRow("1", "A", {}, { created_at: "2026-01-01T00:00:00.000Z" }),
      makeRow("2", "B", {}, { created_at: "2026-12-01T00:00:00.000Z" }),
    ];
    expect(
      filterRows(
        rows,
        [
          {
            fieldId: "f_created",
            op: "gte",
            value: "2026-06-01T00:00:00.000Z",
          },
        ],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("matches checkbox equality against a boolean value", () => {
    const rows = [
      makeRow("1", "A", { f_check: true }),
      makeRow("2", "B", { f_check: false }),
      makeRow("3", "C", {}),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_check", op: "equals", value: true }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
  });

  it("treats multi_select contains as membership", () => {
    const rows = [
      makeRow("1", "A", { f_multi: ["t_a", "t_b"] }),
      makeRow("2", "B", { f_multi: ["t_b"] }),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_multi", op: "contains", value: "t_a" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_multi", op: "not_contains", value: "t_a" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["2"]);
  });

  it("treats relation contains as target-id membership", () => {
    const rows = [
      makeRow("1", "A", {
        f_rel: [{ type: "datagrid_row", id: "r99" }],
      }),
      makeRow("2", "B", { f_rel: [] }),
    ];
    expect(
      filterRows(
        rows,
        [{ fieldId: "f_rel", op: "contains", value: "r99" }],
        FIELDS,
      ).map((r) => r.id),
    ).toEqual(["1"]);
  });

  it("ANDs every filter together", () => {
    const rows = [
      makeRow("1", "A", { f_num: 10, f_text: "keep" }),
      makeRow("2", "B", { f_num: 10, f_text: "drop" }),
      makeRow("3", "C", { f_num: 1, f_text: "keep" }),
    ];
    const filters: DatagridFilter[] = [
      { fieldId: "f_num", op: "gte", value: 5 },
      { fieldId: "f_text", op: "equals", value: "keep" },
    ];
    expect(filterRows(rows, filters, FIELDS).map((r) => r.id)).toEqual(["1"]);
  });
});

describe("sortRows", () => {
  it("sorts by title ascending and descending", () => {
    const rows = [makeRow("1", "Banana"), makeRow("2", "apple")];
    const asc: DatagridSort[] = [{ fieldId: TITLE_FIELD_ID, direction: "asc" }];
    expect(sortRows(rows, asc, FIELDS).map((r) => r.title)).toEqual([
      "apple",
      "Banana",
    ]);
    const desc: DatagridSort[] = [
      { fieldId: TITLE_FIELD_ID, direction: "desc" },
    ];
    expect(sortRows(rows, desc, FIELDS).map((r) => r.title)).toEqual([
      "Banana",
      "apple",
    ]);
  });

  it("sorts numbers numerically", () => {
    const rows = [
      makeRow("1", "A", { f_num: 2 }),
      makeRow("2", "B", { f_num: 10 }),
      makeRow("3", "C", { f_num: 1 }),
    ];
    expect(
      sortRows(rows, [{ fieldId: "f_num", direction: "asc" }], FIELDS).map(
        (r) => r.id,
      ),
    ).toEqual(["3", "1", "2"]);
  });

  it("keeps empty values last regardless of direction", () => {
    const rows = [
      makeRow("1", "A", { f_num: 5 }),
      makeRow("2", "B", {}),
      makeRow("3", "C", { f_num: 1 }),
    ];
    expect(
      sortRows(rows, [{ fieldId: "f_num", direction: "asc" }], FIELDS).map(
        (r) => r.id,
      ),
    ).toEqual(["3", "1", "2"]);
    expect(
      sortRows(rows, [{ fieldId: "f_num", direction: "desc" }], FIELDS).map(
        (r) => r.id,
      ),
    ).toEqual(["1", "3", "2"]);
  });

  it("applies multiple sorts in order and is stable", () => {
    const rows = [
      makeRow("1", "A", { f_num: 1, f_text: "b" }),
      makeRow("2", "B", { f_num: 1, f_text: "a" }),
      makeRow("3", "C", { f_num: 2, f_text: "a" }),
      makeRow("4", "D", { f_num: 1, f_text: "a" }),
    ];
    const sorts: DatagridSort[] = [
      { fieldId: "f_num", direction: "asc" },
      { fieldId: "f_text", direction: "asc" },
    ];
    // num asc groups {1,1,1},{2}; within num=1, text asc -> a,a,b; ties (2 & 4)
    // keep original order.
    expect(sortRows(rows, sorts, FIELDS).map((r) => r.id)).toEqual([
      "2",
      "4",
      "1",
      "3",
    ]);
  });

  it("returns a new array and does not mutate the input", () => {
    const rows = [makeRow("2", "B"), makeRow("1", "A")];
    const sorted = sortRows(
      rows,
      [{ fieldId: TITLE_FIELD_ID, direction: "asc" }],
      FIELDS,
    );
    expect(sorted).not.toBe(rows);
    expect(rows.map((r) => r.id)).toEqual(["2", "1"]);
  });
});

describe("groupRows", () => {
  it("groups by status option, labeled by option name, empty last", () => {
    const rows = [
      makeRow("1", "A", { f_status: "s_done" }),
      makeRow("2", "B", { f_status: "s_todo" }),
      makeRow("3", "C", {}),
      makeRow("4", "D", { f_status: "s_todo" }),
    ];
    const sections = groupRows(rows, "f_status", FIELDS);
    expect(
      sections.map((s) => ({
        key: s.key,
        label: s.label,
        ids: s.rows.map((r) => r.id),
      })),
    ).toEqual([
      { key: "s_todo", label: "Todo", ids: ["2", "4"] },
      { key: "s_done", label: "Done", ids: ["1"] },
      { key: "", label: "No Stage", ids: ["3"] },
    ]);
  });

  it("puts a multi_select row into every selected group", () => {
    const rows = [
      makeRow("1", "A", { f_multi: ["t_a", "t_b"] }),
      makeRow("2", "B", { f_multi: ["t_b"] }),
    ];
    const sections = groupRows(rows, "f_multi", FIELDS);
    expect(
      sections.map((s) => ({ key: s.key, ids: s.rows.map((r) => r.id) })),
    ).toEqual([
      { key: "t_a", ids: ["1"] },
      { key: "t_b", ids: ["1", "2"] },
    ]);
  });

  it("groups checkboxes into checked / unchecked", () => {
    const rows = [
      makeRow("1", "A", { f_check: true }),
      makeRow("2", "B", { f_check: false }),
      makeRow("3", "C", {}),
    ];
    const sections = groupRows(rows, "f_check", FIELDS);
    expect(
      sections.map((s) => ({
        key: s.key,
        label: s.label,
        ids: s.rows.map((r) => r.id),
      })),
    ).toEqual([
      { key: "true", label: "Checked", ids: ["1"] },
      { key: "false", label: "Unchecked", ids: ["2", "3"] },
    ]);
  });
});

describe("queryDatagrid", () => {
  it("filters then sorts, with null sections when no groupBy", () => {
    const rows = [
      makeRow("1", "A", { f_num: 3 }),
      makeRow("2", "B", { f_num: 1 }),
      makeRow("3", "C", { f_num: 9 }),
    ];
    const result = queryDatagrid(
      rows,
      {
        filters: [{ fieldId: "f_num", op: "lt", value: 9 }],
        sorts: [{ fieldId: "f_num", direction: "asc" }],
        groupBy: null,
      },
      FIELDS,
    );
    expect(result.rows.map((r) => r.id)).toEqual(["2", "1"]);
    expect(result.sections).toBeNull();
  });

  it("produces grouped sections over the filtered + sorted rows", () => {
    const rows = [
      makeRow("1", "A", { f_status: "s_todo", f_num: 2 }),
      makeRow("2", "B", { f_status: "s_todo", f_num: 1 }),
      makeRow("3", "C", { f_status: "s_done", f_num: 5 }),
    ];
    const result = queryDatagrid(
      rows,
      {
        filters: [],
        sorts: [{ fieldId: "f_num", direction: "asc" }],
        groupBy: "f_status",
      },
      FIELDS,
    );
    expect(
      result.sections?.map((s) => ({
        key: s.key,
        ids: s.rows.map((r) => r.id),
      })),
    ).toEqual([
      { key: "s_todo", ids: ["2", "1"] },
      { key: "s_done", ids: ["3"] },
    ]);
  });
});
