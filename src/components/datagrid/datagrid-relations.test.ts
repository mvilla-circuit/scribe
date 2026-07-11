import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import {
  booksKey,
  datagridRowsKey,
  datagridsKey,
  entriesKey,
  pageIndexKey,
} from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeDatagrid, makeDatagridRow } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderHookWithQuery,
} from "@/test/render-with-query";

import {
  buildRelationOptions,
  type RelationSources,
  resolveRelationLabel,
  useDatagridRelationTargets,
} from "./datagrid-relations";

const base: RelationSources = {
  currentCollectionId: "col-1",
  datagridRows: [
    {
      id: "row-here",
      datagridId: "dg-1",
      title: "Same collection row",
      collectionId: "col-1",
    },
    {
      id: "row-away",
      datagridId: "dg-away",
      title: "Other collection row",
      collectionId: "col-2",
    },
  ],
  books: [{ id: "book-1", title: "A Book" }],
  entries: [
    { id: "entry-here", title: "Local entry", collectionId: "col-1" },
    { id: "entry-away", title: "Foreign entry", collectionId: "col-9" },
  ],
  documents: [{ id: "doc-1", title: "A Page" }],
};

describe("buildRelationOptions", () => {
  it("lists a same-collection datagrid row before other target kinds", () => {
    const options = buildRelationOptions(base);
    const first = options[0];
    expect(first?.ref).toEqual({ type: "datagrid_row", id: "row-here" });
  });

  it("includes books, entries, and documents as targets", () => {
    const options = buildRelationOptions(base);
    const kinds = new Set(options.map((o) => o.ref.type));
    expect(kinds).toContain("datagrid_row");
    expect(kinds).toContain("book");
    expect(kinds).toContain("entry");
    expect(kinds).toContain("document");
  });

  it("ranks the same-collection row ahead of an off-collection row", () => {
    const options = buildRelationOptions(base);
    const here = options.findIndex((o) => o.ref.id === "row-here");
    const away = options.findIndex((o) => o.ref.id === "row-away");
    expect(here).toBeLessThan(away);
  });

  it("filters options by a case-insensitive query", () => {
    const options = buildRelationOptions({ ...base, query: "a book" });
    expect(options).toHaveLength(1);
    expect(options[0]?.ref).toEqual({ type: "book", id: "book-1" });
  });
});

describe("resolveRelationLabel", () => {
  it("resolves a known reference to its title", () => {
    expect(resolveRelationLabel(base, { type: "book", id: "book-1" })).toBe(
      "A Book",
    );
  });

  it("falls back to a short id for an unknown reference", () => {
    const label = resolveRelationLabel(base, {
      type: "document",
      id: "missing-id-1234",
    });
    expect(label).toBe("missing-i");
  });
});

describe("useDatagridRelationTargets", () => {
  beforeEach(() => {
    useUIStore.getState().navigateTo({});
  });

  function seed() {
    const client = createTestQueryClient();
    client.setQueryData(datagridsKey, [
      makeDatagrid({ id: "dg-1", collection_id: "col-1" }),
      makeDatagrid({ id: "dg-2", collection_id: "col-1" }),
    ]);
    client.setQueryData(datagridRowsKey("dg-1"), [
      makeDatagridRow({ id: "row-1", datagrid_id: "dg-1", title: "Row One" }),
    ]);
    client.setQueryData(datagridRowsKey("dg-2"), [
      makeDatagridRow({ id: "row-2", datagrid_id: "dg-2", title: "Row Two" }),
    ]);
    client.setQueryData(booksKey, []);
    client.setQueryData(entriesKey, []);
    client.setQueryData(pageIndexKey, []);
    return client;
  }

  it("includes rows from sibling datagrids in the same collection", () => {
    const { result } = renderHookWithQuery(
      () => useDatagridRelationTargets("dg-1"),
      { client: seed() },
    );
    const ids = result.current.options.map((o) => o.ref.id);
    expect(ids).toContain("row-1");
    expect(ids).toContain("row-2");
  });

  it("ranks sibling-datagrid rows alongside the current grid's rows", () => {
    const { result } = renderHookWithQuery(
      () => useDatagridRelationTargets("dg-1"),
      { client: seed() },
    );
    const away = result.current.options.findIndex((o) => o.ref.id === "row-2");
    // Both rows share the collection, so the sibling row should rank with
    // (not after) the current grid's own rows — well before an empty tail.
    expect(away).toBeLessThan(2);
  });

  it("navigates a sibling row through its owning datagrid", () => {
    const { result } = renderHookWithQuery(
      () => useDatagridRelationTargets("dg-1"),
      { client: seed() },
    );

    act(() => {
      result.current.navigate({ type: "datagrid_row", id: "row-2" });
    });

    expect(useUIStore.getState()).toMatchObject({
      activeDatagridId: "dg-2",
      activeDatagridRowId: "row-2",
    });
  });

  it("does not load or return sibling rows when disabled", () => {
    const client = seed();
    client.removeQueries({ queryKey: datagridRowsKey("dg-2") });

    const { result } = renderHookWithQuery(
      () => useDatagridRelationTargets("dg-1", { enabled: false }),
      { client },
    );

    expect(
      result.current.options.filter(
        (option) => option.ref.type === "datagrid_row",
      ),
    ).toEqual([]);
    expect(client.getQueryState(datagridRowsKey("dg-2"))).toBeUndefined();
  });
});
