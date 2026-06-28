import { describe, expect, it } from "vitest";

import { INDENT } from "@/components/tree/tree-dnd";
import { buildTree } from "@/data/tree";
import { makeBook, makeFolder } from "@/test/fixtures";

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
