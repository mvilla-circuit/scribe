import { describe, expect, it } from "vitest";

import { INDENT } from "@/components/tree/tree-dnd";
import { buildTree } from "@/data/tree";
import { makeBook, makeCollection, makeFolder } from "@/test/fixtures";

import { flattenTree, getProjection } from "./dnd-tree";

const model = buildTree(
  [makeFolder({ id: "f1", position: 1024 })],
  [
    makeBook({ id: "b1", folder_id: "f1", position: 1024 }),
    makeBook({ id: "b2", folder_id: null, position: 2048 }),
  ],
);

describe("flattenTree", () => {
  it("descends into expanded folders, tagging depth", () => {
    expect(
      flattenTree(model, new Set(["f1"])).map((n) => ({
        id: n.id,
        depth: n.depth,
      })),
    ).toEqual([
      { id: "f1", depth: 0 },
      { id: "b1", depth: 1 },
      { id: "b2", depth: 0 },
    ]);
  });

  it("hides folder contents when collapsed", () => {
    expect(flattenTree(model, new Set()).map((n) => n.id)).toEqual([
      "f1",
      "b2",
    ]);
  });
});

describe("getProjection", () => {
  const nodes = flattenTree(model, new Set(["f1"]));

  it("nests a root book under the preceding folder when dragged right", () => {
    expect(getProjection(nodes, "b2", "b1", INDENT)).toEqual({
      depth: 1,
      parentId: "f1",
    });
  });

  it("pins a dragged folder to the root regardless of horizontal offset", () => {
    expect(getProjection(nodes, "f1", "b2", INDENT * 3)).toEqual({
      depth: 0,
      parentId: null,
    });
  });
});

describe("collections in the tree", () => {
  // c1 (root, expanded) contains book b1; c2 is a second root collection.
  const collModel = buildTree(
    [],
    [makeBook({ id: "b1", collection_id: "c1", position: 1024 })],
    [
      makeCollection({ id: "c1", position: 1024 }),
      makeCollection({ id: "c2", position: 2048 }),
    ],
  );

  it("descends into an expanded collection", () => {
    expect(
      flattenTree(collModel, new Set(["c1"])).map((n) => ({
        id: n.id,
        depth: n.depth,
        kind: n.kind,
      })),
    ).toEqual([
      { id: "c1", depth: 0, kind: "collection" },
      { id: "b1", depth: 1, kind: "book" },
      { id: "c2", depth: 0, kind: "collection" },
    ]);
  });

  it("nests a collection under the preceding collection when dragged right", () => {
    const nodes = flattenTree(collModel, new Set(["c1"]));
    expect(getProjection(nodes, "c2", "b1", INDENT)).toEqual({
      depth: 1,
      parentId: "c1",
    });
  });

  it("nests a book under a collection when dragged right", () => {
    // c1 (expanded) with child b1; b2 a root book after it.
    const model = buildTree(
      [],
      [
        makeBook({ id: "b1", collection_id: "c1", position: 1024 }),
        makeBook({ id: "b2", folder_id: null, position: 4096 }),
      ],
      [makeCollection({ id: "c1", position: 1024 })],
    );
    const nodes = flattenTree(model, new Set(["c1"]));
    expect(getProjection(nodes, "b2", "b1", INDENT)).toEqual({
      depth: 1,
      parentId: "c1",
    });
  });

  it("snaps a collection to the root instead of nesting it inside a folder", () => {
    // f1 (expanded, root-only) holds books bf1, bf2; c1 is a root collection.
    const model = buildTree(
      [makeFolder({ id: "f1", position: 1024 })],
      [
        makeBook({ id: "bf1", folder_id: "f1", position: 1024 }),
        makeBook({ id: "bf2", folder_id: "f1", position: 2048 }),
      ],
      [makeCollection({ id: "c1", position: 4096 })],
    );
    const nodes = flattenTree(model, new Set(["f1"]));
    expect(getProjection(nodes, "c1", "bf2", INDENT)).toEqual({
      depth: 0,
      parentId: null,
    });
  });
});
