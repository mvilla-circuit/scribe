import { describe, expect, it } from "vitest";

import {
  makeBook,
  makeCollection,
  makeDatagrid,
  makeEntry,
  makeFolder,
  makeWhiteboard,
} from "@/test/fixtures";

import {
  buildTree,
  childrenOf,
  collectionAncestors,
  collectionDescendants,
  countBooksInFolder,
  countChildren,
  ROOT,
} from "./tree";

describe("buildTree", () => {
  it("buckets folders and root-level books under ROOT, sorted by position", () => {
    const folder = makeFolder({ id: "f1", position: 2048 });
    const book = makeBook({ id: "b1", folder_id: null, position: 1024 });
    const model = buildTree([folder], [book]);

    const roots = childrenOf(model, ROOT);
    expect(roots.map((c) => ({ kind: c.kind, id: c.id }))).toEqual([
      { kind: "book", id: "b1" },
      { kind: "folder", id: "f1" },
    ]);
  });

  it("nests books under their folder container", () => {
    const folder = makeFolder({ id: "f1" });
    const inside = makeBook({ id: "b1", folder_id: "f1", position: 2048 });
    const inside2 = makeBook({ id: "b2", folder_id: "f1", position: 1024 });
    const model = buildTree([folder], [inside, inside2]);

    expect(childrenOf(model, "f1").map((c) => c.id)).toEqual(["b2", "b1"]);
    expect(childrenOf(model, ROOT).map((c) => c.id)).toEqual(["f1"]);
  });

  it("buckets root collections and nests child collections under their parent", () => {
    const parent = makeCollection({ id: "c1", parent_collection_id: null });
    const child = makeCollection({ id: "c2", parent_collection_id: "c1" });
    const model = buildTree([], [], [parent, child]);

    expect(
      childrenOf(model, ROOT).map((c) => ({ kind: c.kind, id: c.id })),
    ).toEqual([{ kind: "collection", id: "c1" }]);
    expect(childrenOf(model, "c1").map((c) => c.id)).toEqual(["c2"]);
  });

  it("nests a book under its collection, preferring collection over folder", () => {
    const collection = makeCollection({ id: "c1" });
    const folder = makeFolder({ id: "f1" });
    // A book that names both lands in the collection (mutually exclusive in the
    // UI, but the model must pick a single container deterministically).
    const book = makeBook({ id: "b1", collection_id: "c1", folder_id: "f1" });
    const model = buildTree([folder], [book], [collection]);

    expect(childrenOf(model, "c1").map((c) => c.id)).toEqual(["b1"]);
    expect(childrenOf(model, "f1")).toEqual([]);
  });

  it("places an entry under its collection", () => {
    const collection = makeCollection({ id: "c1" });
    const entry = makeEntry({ id: "e1", collection_id: "c1" });
    const model = buildTree([], [], [collection], [entry]);

    expect(
      childrenOf(model, "c1").map((child) => ({
        kind: child.kind,
        id: child.id,
      })),
    ).toEqual([{ kind: "entry", id: "e1" }]);
  });

  it("places a datagrid under its collection", () => {
    const collection = makeCollection({ id: "c1" });
    const datagrid = makeDatagrid({ id: "dg1", collection_id: "c1" });
    const model = buildTree([], [], [collection], [], [datagrid]);

    expect(
      childrenOf(model, "c1").map((child) => ({
        kind: child.kind,
        id: child.id,
      })),
    ).toEqual([{ kind: "datagrid", id: "dg1" }]);
  });

  it("interleaves a datagrid with entries by position under its collection", () => {
    const collection = makeCollection({ id: "c1" });
    const entry = makeEntry({ id: "e1", collection_id: "c1", position: 2048 });
    const datagrid = makeDatagrid({
      id: "dg1",
      collection_id: "c1",
      position: 1024,
    });
    const model = buildTree([], [], [collection], [entry], [datagrid]);

    expect(
      childrenOf(model, "c1").map((child) => ({
        kind: child.kind,
        id: child.id,
      })),
    ).toEqual([
      { kind: "datagrid", id: "dg1" },
      { kind: "entry", id: "e1" },
    ]);
  });

  it("never nests a datagrid at the root even without a collection match", () => {
    const datagrid = makeDatagrid({ id: "dg1", collection_id: "c1" });
    const model = buildTree([], [], [], [], [datagrid]);

    expect(childrenOf(model, ROOT)).toEqual([]);
    expect(childrenOf(model, "c1").map((child) => child.id)).toEqual(["dg1"]);
  });

  it("nests whiteboard under collection", () => {
    const collection = makeCollection({ id: "c1" });
    const whiteboard = makeWhiteboard({
      id: "wb1",
      collection_id: "c1",
    });
    const model = buildTree([], [], [collection], [], [], [whiteboard]);

    expect(
      childrenOf(model, "c1").map((child) => ({
        kind: child.kind,
        id: child.id,
      })),
    ).toEqual([{ kind: "whiteboard", id: "wb1" }]);
    expect(childrenOf(model, ROOT).map((child) => child.id)).toEqual(["c1"]);
  });

  it("returns an empty list for an unknown container", () => {
    const model = buildTree([], []);
    expect(childrenOf(model, "nope")).toEqual([]);
  });
});

describe("countBooksInFolder", () => {
  it("counts only the books directly inside a folder", () => {
    const folder = makeFolder({ id: "f1" });
    const model = buildTree(
      [folder],
      [
        makeBook({ id: "b1", folder_id: "f1" }),
        makeBook({ id: "b2", folder_id: "f1" }),
        makeBook({ id: "b3", folder_id: null }),
      ],
    );
    expect(countBooksInFolder(model, "f1")).toBe(2);
  });

  it("is zero for an empty folder", () => {
    const model = buildTree([makeFolder({ id: "f1" })], []);
    expect(countBooksInFolder(model, "f1")).toBe(0);
  });
});

describe("countChildren", () => {
  it("counts the direct children (books + collections) of a collection", () => {
    const model = buildTree(
      [],
      [
        makeBook({ id: "b1", collection_id: "c1" }),
        makeBook({ id: "b2", collection_id: "c1" }),
      ],
      [
        makeCollection({ id: "c1" }),
        makeCollection({ id: "c2", parent_collection_id: "c1" }),
      ],
    );
    expect(countChildren(model, "c1")).toBe(3);
  });
});

describe("collectionAncestors", () => {
  it("returns the root-first ancestor chain, excluding the collection itself", () => {
    const collections = [
      makeCollection({ id: "c1", parent_collection_id: null }),
      makeCollection({ id: "c2", parent_collection_id: "c1" }),
      makeCollection({ id: "c3", parent_collection_id: "c2" }),
    ];
    expect(collectionAncestors(collections, "c3").map((c) => c.id)).toEqual([
      "c1",
      "c2",
    ]);
  });

  it("is empty for a root collection and guards against cycles", () => {
    const collections = [
      makeCollection({ id: "c1", parent_collection_id: null }),
      // A defensive cycle (c2 -> c3 -> c2) must not loop forever.
      makeCollection({ id: "c2", parent_collection_id: "c3" }),
      makeCollection({ id: "c3", parent_collection_id: "c2" }),
    ];
    expect(collectionAncestors(collections, "c1")).toEqual([]);
    expect(collectionAncestors(collections, "c2").length).toBeLessThanOrEqual(
      2,
    );
  });
});

describe("collectionDescendants", () => {
  it("returns every nested descendant id, excluding the collection itself", () => {
    const collections = [
      makeCollection({ id: "c1", parent_collection_id: null }),
      makeCollection({ id: "c2", parent_collection_id: "c1" }),
      makeCollection({ id: "c3", parent_collection_id: "c2" }),
      makeCollection({ id: "other", parent_collection_id: null }),
    ];
    const descendants = collectionDescendants(collections, "c1");
    expect(descendants).toEqual(new Set(["c2", "c3"]));
    expect(descendants.has("c1")).toBe(false);
    expect(descendants.has("other")).toBe(false);
  });

  it("is empty for a leaf collection", () => {
    const collections = [
      makeCollection({ id: "c1", parent_collection_id: null }),
      makeCollection({ id: "c2", parent_collection_id: "c1" }),
    ];
    expect(collectionDescendants(collections, "c2")).toEqual(new Set());
  });
});
