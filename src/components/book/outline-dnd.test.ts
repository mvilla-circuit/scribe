import { describe, expect, it } from "vitest";

import { INDENT, removeDescendants } from "@/components/tree/tree-dnd";
import { buildBookOutlineTree } from "@/data/book-outline-tree";
import { makeDocument, makeWhiteboard } from "@/test/fixtures";

import {
  flattenBookOutlineTree,
  getBookOutlineProjection,
} from "./outline-dnd";

const docs = [
  makeDocument({ id: "ch1", position: 1024 }),
  makeDocument({ id: "ch1a", parent_document_id: "ch1", position: 1024 }),
  makeDocument({ id: "ch2", position: 2048 }),
];

describe("flattenBookOutlineTree", () => {
  it("descends into expanded nodes only and flags hasChildren", () => {
    const tree = buildBookOutlineTree(docs, []);
    expect(
      flattenBookOutlineTree(tree, new Set()).map((n) => ({
        id: n.id,
        depth: n.depth,
        hasChildren: n.hasChildren,
      })),
    ).toEqual([
      { id: "ch1", depth: 0, hasChildren: true },
      { id: "ch2", depth: 0, hasChildren: false },
    ]);
    expect(
      flattenBookOutlineTree(tree, new Set(["ch1"])).map((n) => n.id),
    ).toEqual(["ch1", "ch1a", "ch2"]);
  });

  it("includes nested whiteboards at their shared sibling position", () => {
    const tree = buildBookOutlineTree(docs, [
      makeWhiteboard({
        id: "board",
        collection_id: null,
        book_id: "book-1",
        parent_document_id: "ch1",
        position: 512,
      }),
    ]);

    expect(
      flattenBookOutlineTree(tree, new Set(["ch1"])).map((node) => ({
        id: node.id,
        kind: node.kind,
        depth: node.depth,
      })),
    ).toEqual([
      { id: "ch1", kind: "document", depth: 0 },
      { id: "board", kind: "whiteboard", depth: 1 },
      { id: "ch1a", kind: "document", depth: 1 },
      { id: "ch2", kind: "document", depth: 0 },
    ]);
  });
});

describe("getBookOutlineProjection", () => {
  it("allows nesting one level under any preceding document", () => {
    const nodes = flattenBookOutlineTree(
      buildBookOutlineTree(docs, []),
      new Set(["ch1"]),
    );
    expect(getBookOutlineProjection(nodes, "ch2", "ch1a", INDENT)).toEqual({
      depth: 1,
      parentId: "ch1",
    });
  });

  it("does not allow a whiteboard to become a parent", () => {
    const nodes = flattenBookOutlineTree(
      buildBookOutlineTree(docs, [
        makeWhiteboard({
          id: "board",
          collection_id: null,
          book_id: "book-1",
          position: 1536,
        }),
      ]),
      new Set(),
    );

    expect(getBookOutlineProjection(nodes, "ch2", "board", INDENT)).toEqual({
      depth: 1,
      parentId: "ch1",
    });
  });
});

describe("removeDescendants", () => {
  it("drops the subtree of the dragged document", () => {
    const nodes = flattenBookOutlineTree(
      buildBookOutlineTree(docs, []),
      new Set(["ch1"]),
    );
    expect(removeDescendants(nodes, ["ch1"]).map((n) => n.id)).toEqual([
      "ch1",
      "ch2",
    ]);
  });
});
