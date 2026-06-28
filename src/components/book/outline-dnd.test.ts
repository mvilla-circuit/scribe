import { describe, expect, it } from "vitest";

import { INDENT } from "@/components/tree/tree-dnd";
import { buildDocTree } from "@/data/doc-tree";
import { makeDocument } from "@/test/fixtures";

import {
  flattenDocTree,
  getDocProjection,
  removeDocDescendants,
} from "./outline-dnd";

const docs = [
  makeDocument({ id: "ch1", position: 1024 }),
  makeDocument({ id: "ch1a", parent_document_id: "ch1", position: 1024 }),
  makeDocument({ id: "ch2", position: 2048 }),
];

describe("flattenDocTree", () => {
  it("descends into expanded nodes only and flags hasChildren", () => {
    const tree = buildDocTree(docs);
    expect(
      flattenDocTree(tree, new Set()).map((n) => ({
        id: n.id,
        depth: n.depth,
        hasChildren: n.hasChildren,
      })),
    ).toEqual([
      { id: "ch1", depth: 0, hasChildren: true },
      { id: "ch2", depth: 0, hasChildren: false },
    ]);
    expect(flattenDocTree(tree, new Set(["ch1"])).map((n) => n.id)).toEqual([
      "ch1",
      "ch1a",
      "ch2",
    ]);
  });
});

describe("getDocProjection", () => {
  it("allows nesting one level under any preceding document", () => {
    const nodes = flattenDocTree(buildDocTree(docs), new Set(["ch1"]));
    expect(getDocProjection(nodes, "ch2", "ch1a", INDENT)).toEqual({
      depth: 1,
      parentId: "ch1",
    });
  });
});

describe("removeDocDescendants", () => {
  it("drops the subtree of the dragged document", () => {
    const nodes = flattenDocTree(buildDocTree(docs), new Set(["ch1"]));
    expect(removeDocDescendants(nodes, ["ch1"]).map((n) => n.id)).toEqual([
      "ch1",
      "ch2",
    ]);
  });
});
