import { describe, expect, it } from "vitest";

import {
  asRelationRefs,
  asStringArray,
  type DatagridPropertyValue,
  DEFAULT_DATAGRID_VIEW_CONFIG,
  isSafeDatagridUrl,
  parseDatagridFields,
  parseDatagridProperties,
  parseDatagridViewConfig,
  toDatagridProperties,
} from "./datagrid-schema";

describe("parseDatagridFields", () => {
  it("returns empty array for non-arrays", () => {
    expect(parseDatagridFields(null)).toEqual([]);
    expect(parseDatagridFields({})).toEqual([]);
  });

  it("keeps valid fields and drops invalid ones", () => {
    expect(
      parseDatagridFields([
        { id: "f1", name: "Status", type: "status", config: { options: [] } },
        { id: "bad", name: "X", type: "formula" },
        { name: "no-id", type: "text" },
      ]),
    ).toEqual([
      { id: "f1", name: "Status", type: "status", config: { options: [] } },
    ]);
  });
});

describe("parseDatagridViewConfig", () => {
  it("falls back to defaults for garbage input", () => {
    expect(parseDatagridViewConfig(null)).toEqual(DEFAULT_DATAGRID_VIEW_CONFIG);
  });

  it("parses a known layout and visible fields", () => {
    expect(
      parseDatagridViewConfig({
        layout: "board",
        visibleFieldIds: ["a", "b"],
        boardFieldId: "status",
      }),
    ).toMatchObject({
      layout: "board",
      visibleFieldIds: ["a", "b"],
      // Omitted cardVisibleFieldIds falls back to column visibility.
      cardVisibleFieldIds: ["a", "b"],
      boardFieldId: "status",
    });
  });

  it("parses cardVisibleFieldIds when present", () => {
    expect(
      parseDatagridViewConfig({
        visibleFieldIds: ["a"],
        cardVisibleFieldIds: ["b", "c"],
      }),
    ).toMatchObject({
      visibleFieldIds: ["a"],
      cardVisibleFieldIds: ["b", "c"],
    });
  });

  it("honors an explicit empty cardVisibleFieldIds (all card fields)", () => {
    expect(
      parseDatagridViewConfig({
        visibleFieldIds: ["a"],
        cardVisibleFieldIds: [],
      }),
    ).toMatchObject({
      visibleFieldIds: ["a"],
      cardVisibleFieldIds: [],
    });
  });

  it("keeps only valid filter and sort clauses", () => {
    expect(
      parseDatagridViewConfig({
        filters: [
          { fieldId: "status", op: "equals", value: "done" },
          { fieldId: "title", op: "contains" },
          { fieldId: 42, op: "equals", value: "bad" },
          { fieldId: "status", op: "unknown", value: "bad" },
          null,
        ],
        sorts: [
          { fieldId: "due", direction: "asc" },
          { fieldId: "priority", direction: "desc" },
          { fieldId: 42, direction: "asc" },
          { fieldId: "due", direction: "sideways" },
        ],
      }),
    ).toMatchObject({
      filters: [
        { fieldId: "status", op: "equals", value: "done" },
        { fieldId: "title", op: "contains" },
      ],
      sorts: [
        { fieldId: "due", direction: "asc" },
        { fieldId: "priority", direction: "desc" },
      ],
    });
  });
});

describe("toDatagridProperties", () => {
  it("returns an empty property bag for null and array values", () => {
    expect(toDatagridProperties(null)).toEqual({});
    expect(toDatagridProperties([])).toEqual({});
  });

  it("returns object values as a typed property bag", () => {
    const properties = { title: "Draft", published: false };

    expect(toDatagridProperties(properties)).toBe(properties);
  });
});

describe("asStringArray", () => {
  it("keeps only string members from array values", () => {
    expect(asStringArray(["a", "b"])).toEqual(["a", "b"]);
    const mixed = ["a", 1, "b"] as DatagridPropertyValue;
    expect(asStringArray(mixed)).toEqual(["a", "b"]);
    expect(asStringArray(null)).toEqual([]);
    expect(asStringArray("a")).toEqual([]);
  });
});

describe("asRelationRefs", () => {
  it("keeps only valid relation refs with non-empty ids", () => {
    const refs = [
      { type: "book" as const, id: "b1" },
      { type: "entry" as const, id: "e1" },
    ];
    expect(asRelationRefs(refs)).toEqual(refs);
    const mixed = [
      "b1",
      { type: "book", id: "b1" },
      { type: "unknown", id: "bad" },
      { type: "entry", id: "" },
      { type: "entry", id: "   " },
      { id: "missing-type" },
    ] as DatagridPropertyValue;
    expect(asRelationRefs(mixed)).toEqual([{ type: "book", id: "b1" }]);
    expect(asRelationRefs(null)).toEqual([]);
  });

  it("trims surrounding whitespace on relation ids", () => {
    expect(
      asRelationRefs([{ type: "book", id: "  b1  " }] as DatagridPropertyValue),
    ).toEqual([{ type: "book", id: "b1" }]);
  });
});

describe("isSafeDatagridUrl", () => {
  it("allows http(s) and protocol-relative urls", () => {
    expect(isSafeDatagridUrl("https://example.com")).toBe(true);
    expect(isSafeDatagridUrl("http://example.com/path")).toBe(true);
    expect(isSafeDatagridUrl("//cdn.example.com/a")).toBe(true);
  });

  it("rejects dangerous schemes, schemeless hosts, and control chars", () => {
    expect(isSafeDatagridUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeDatagridUrl("data:text/html,hi")).toBe(false);
    expect(isSafeDatagridUrl("example.com")).toBe(false);
    expect(isSafeDatagridUrl("/relative/path")).toBe(false);
    expect(
      isSafeDatagridUrl(`java${String.fromCharCode(0)}script:alert(1)`),
    ).toBe(false);
    expect(isSafeDatagridUrl("")).toBe(false);
  });
});

describe("parseDatagridProperties", () => {
  const fields = parseDatagridFields([
    { id: "text", name: "Text", type: "text" },
    { id: "number", name: "Number", type: "number" },
    { id: "checkbox", name: "Checkbox", type: "checkbox" },
    { id: "multi", name: "Tags", type: "multi_select" },
    { id: "relation", name: "Relation", type: "relation" },
  ]);

  it("keeps plausible values for known field types", () => {
    expect(
      parseDatagridProperties(fields, {
        text: "Draft",
        number: 12,
        checkbox: false,
        multi: ["one", "two"],
        relation: [
          { type: "book", id: "book-1" },
          { type: "datagrid_row", id: "row-1" },
        ],
      }),
    ).toEqual({
      text: "Draft",
      number: 12,
      checkbox: false,
      multi: ["one", "two"],
      relation: [
        { type: "book", id: "book-1" },
        { type: "datagrid_row", id: "row-1" },
      ],
    });
  });

  it("drops invalid values and orphaned field ids", () => {
    expect(
      parseDatagridProperties(fields, {
        text: 12,
        number: "12",
        checkbox: "false",
        multi: ["valid", 2],
        relation: [
          { type: "book", id: "book-1" },
          { type: "unknown", id: "bad" },
        ],
        deleted: "orphan",
      }),
    ).toEqual({});
  });

  it("accepts null for nullable scalar fields", () => {
    expect(
      parseDatagridProperties(fields, {
        text: null,
        number: null,
        checkbox: null,
      }),
    ).toEqual({
      text: null,
      number: null,
      checkbox: null,
    });
  });
});
