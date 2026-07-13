import { describe, expect, it } from "vitest";

import type { DatagridRowMeta } from "@/data/datagrid-rows";
import type { Json } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import {
  makeDatagrid,
  makeDatagridRow,
  makeDatagridView,
} from "@/test/fixtures";

import {
  buildDatagridLinkOptions,
  buildDatagridRowLinkOptions,
  indexCardVisibleFieldIdsByDatagrid,
  indexRowsByDatagrid,
  resolveDatagridRow,
} from "./datagrid-row-resolve";

const asJson = (value: unknown): Json => JSON.parse(JSON.stringify(value));

const textField = (id: string, name: string): DatagridField => ({
  id,
  name,
  type: "text",
  config: {},
});

function meta(
  overrides: Partial<DatagridRowMeta> &
    Pick<DatagridRowMeta, "id" | "datagrid_id">,
): DatagridRowMeta {
  const { content: _content, ...rest } = makeDatagridRow(overrides);
  return rest;
}

describe("resolveDatagridRow", () => {
  it("returns null when datagrid or row id is missing", () => {
    const datagrids = [makeDatagrid({ id: "dg1", fields: asJson([]) })];
    const byDatagrid = indexRowsByDatagrid([]);

    expect(resolveDatagridRow(datagrids, byDatagrid, null, "r1")).toBeNull();
    expect(resolveDatagridRow(datagrids, byDatagrid, "dg1", null)).toBeNull();
  });

  it("returns null when the datagrid or row cannot be found", () => {
    const datagrids = [makeDatagrid({ id: "dg1", fields: asJson([]) })];
    const byDatagrid = indexRowsByDatagrid([
      meta({ id: "r1", datagrid_id: "dg1", title: "Alpha" }),
    ]);

    expect(
      resolveDatagridRow(datagrids, byDatagrid, "missing", "r1"),
    ).toBeNull();
    expect(
      resolveDatagridRow(datagrids, byDatagrid, "dg1", "missing"),
    ).toBeNull();
  });

  it("resolves title, icon, cover, datagrid name, and ≤5 field previews", () => {
    const fields: DatagridField[] = [
      textField("a", "A"),
      textField("b", "B"),
      textField("c", "C"),
      textField("d", "D"),
      textField("e", "E"),
      textField("f", "F"),
    ];
    const datagrids = [
      makeDatagrid({
        id: "dg1",
        name: "Characters",
        fields: asJson(fields),
      }),
    ];
    const row = meta({
      id: "r1",
      datagrid_id: "dg1",
      title: "Aria",
      icon: "🗡️",
      cover_url: "https://cdn.test/cover.jpg",
      properties: asJson({
        a: "one",
        b: "two",
        c: "three",
        d: "four",
        e: "five",
        f: "six",
      }),
    });
    const byDatagrid = indexRowsByDatagrid([row]);

    const resolved = resolveDatagridRow(datagrids, byDatagrid, "dg1", "r1");

    expect(resolved).toEqual({
      title: "Aria",
      icon: "🗡️",
      coverUrl: "https://cdn.test/cover.jpg",
      datagridName: "Characters",
      fieldsPreview: [
        { fieldId: "a", text: "one" },
        { fieldId: "b", text: "two" },
        { fieldId: "c", text: "three" },
        { fieldId: "d", text: "four" },
        { fieldId: "e", text: "five" },
      ],
    });
  });

  it("omits empty field values from the preview", () => {
    const fields = [textField("a", "A"), textField("b", "B")];
    const datagrids = [
      makeDatagrid({ id: "dg1", name: "Grid", fields: asJson(fields) }),
    ];
    const byDatagrid = indexRowsByDatagrid([
      meta({
        id: "r1",
        datagrid_id: "dg1",
        title: "Row",
        properties: asJson({ a: "", b: "kept" }),
      }),
    ]);

    expect(
      resolveDatagridRow(datagrids, byDatagrid, "dg1", "r1")?.fieldsPreview,
    ).toEqual([{ fieldId: "b", text: "kept" }]);
  });

  it("formats select option names and checkbox truthy values", () => {
    const fields: DatagridField[] = [
      {
        id: "stage",
        name: "Stage",
        type: "select",
        config: { options: [{ id: "o1", name: "Draft", color: "sky" }] },
      },
      { id: "done", name: "Done", type: "checkbox", config: {} },
    ];
    const datagrids = [
      makeDatagrid({ id: "dg1", name: "Grid", fields: asJson(fields) }),
    ];
    const byDatagrid = indexRowsByDatagrid([
      meta({
        id: "r1",
        datagrid_id: "dg1",
        title: "Row",
        properties: asJson({ stage: "o1", done: true }),
      }),
    ]);

    expect(
      resolveDatagridRow(datagrids, byDatagrid, "dg1", "r1")?.fieldsPreview,
    ).toEqual([
      { fieldId: "stage", text: "Draft" },
      { fieldId: "done", text: "Yes" },
    ]);
  });

  it("limits field previews to the view's visibleFieldIds", () => {
    const fields = [
      textField("a", "A"),
      textField("b", "B"),
      textField("c", "C"),
    ];
    const datagrids = [
      makeDatagrid({ id: "dg1", name: "Grid", fields: asJson(fields) }),
    ];
    const byDatagrid = indexRowsByDatagrid([
      meta({
        id: "r1",
        datagrid_id: "dg1",
        title: "Row",
        properties: asJson({ a: "one", b: "two", c: "three" }),
      }),
    ]);
    const visible = new Map([["dg1", ["c", "a"]]]);

    expect(
      resolveDatagridRow(datagrids, byDatagrid, "dg1", "r1", visible)
        ?.fieldsPreview,
    ).toEqual([
      { fieldId: "c", text: "three" },
      { fieldId: "a", text: "one" },
    ]);
  });
});

describe("buildDatagridLinkOptions", () => {
  it("lists each datagrid for the first picker step", () => {
    const options = buildDatagridLinkOptions([
      makeDatagrid({ id: "dg1", name: "Cast", icon: "🎭" }),
      makeDatagrid({ id: "dg2", name: "", icon: null }),
    ]);

    expect(options).toEqual([
      {
        datagridId: "dg1",
        label: "Cast",
        icon: "🎭",
        subtitle: "Datagrid",
      },
      {
        datagridId: "dg2",
        label: "Untitled",
        icon: null,
        subtitle: "Datagrid",
      },
    ]);
  });
});

describe("buildDatagridRowLinkOptions", () => {
  it("lists rows for one datagrid with the grid name as subtitle", () => {
    const datagrid = makeDatagrid({ id: "dg1", name: "Cast" });
    const rows = [
      meta({ id: "r1", datagrid_id: "dg1", title: "Aria", icon: "🗡️" }),
      meta({ id: "r2", datagrid_id: "dg1", title: "" }),
    ];

    expect(buildDatagridRowLinkOptions(datagrid, rows)).toEqual([
      {
        datagridId: "dg1",
        rowId: "r1",
        label: "Aria",
        icon: "🗡️",
        subtitle: "Cast",
      },
      {
        datagridId: "dg1",
        rowId: "r2",
        label: "Untitled",
        icon: null,
        subtitle: "Cast",
      },
    ]);
  });
});

describe("indexCardVisibleFieldIdsByDatagrid", () => {
  it("indexes cardVisibleFieldIds from the default view", () => {
    const views = [
      makeDatagridView({
        id: "v1",
        datagrid_id: "dg1",
        is_default: true,
        config: asJson({
          layout: "gallery",
          visibleFieldIds: ["a"],
          cardVisibleFieldIds: ["b", "c"],
        }),
      }),
    ];
    expect(indexCardVisibleFieldIdsByDatagrid(views).get("dg1")).toEqual([
      "b",
      "c",
    ]);
  });

  it("falls back to visibleFieldIds when cardVisibleFieldIds is omitted", () => {
    const views = [
      makeDatagridView({
        id: "v1",
        datagrid_id: "dg1",
        is_default: true,
        config: asJson({
          layout: "table",
          visibleFieldIds: ["about"],
        }),
      }),
    ];
    expect(indexCardVisibleFieldIdsByDatagrid(views).get("dg1")).toEqual([
      "about",
    ]);
  });

  it("prefers the default view when multiple views exist", () => {
    const views = [
      makeDatagridView({
        id: "v-other",
        datagrid_id: "dg1",
        is_default: false,
        config: asJson({
          layout: "gallery",
          cardVisibleFieldIds: ["a"],
        }),
      }),
      makeDatagridView({
        id: "v-default",
        datagrid_id: "dg1",
        is_default: true,
        config: asJson({
          layout: "gallery",
          cardVisibleFieldIds: ["b"],
        }),
      }),
    ];
    expect(indexCardVisibleFieldIdsByDatagrid(views).get("dg1")).toEqual(["b"]);
  });
});
