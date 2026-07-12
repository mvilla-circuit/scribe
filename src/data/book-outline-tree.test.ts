import { describe, expect, it } from "vitest";

import { makeDocument, makeWhiteboard } from "@/test/fixtures";

import {
  buildBookOutlineTree,
  outlinePositionSiblings,
} from "./book-outline-tree";

describe("outlinePositionSiblings", () => {
  it("includes pages and whiteboards under the same parent", () => {
    const siblings = outlinePositionSiblings(
      [
        makeDocument({ id: "title", is_title_page: true, position: 0 }),
        makeDocument({ id: "root-page", position: 1024 }),
        makeDocument({
          id: "nested",
          parent_document_id: "root-page",
          position: 512,
        }),
      ],
      [
        makeWhiteboard({
          id: "root-board",
          collection_id: null,
          book_id: "book-1",
          position: 2048,
        }),
        makeWhiteboard({
          id: "nested-board",
          collection_id: null,
          book_id: "book-1",
          parent_document_id: "root-page",
          position: 256,
        }),
      ],
      null,
    );

    expect(siblings.map((sibling) => sibling.position)).toEqual([1024, 2048]);
  });
});

describe("buildBookOutlineTree", () => {
  it("interleaves pages and book whiteboards by shared sibling position", () => {
    const tree = buildBookOutlineTree(
      [
        makeDocument({ id: "title", is_title_page: true }),
        makeDocument({ id: "page", position: 2048 }),
      ],
      [
        makeWhiteboard({
          id: "board",
          collection_id: null,
          book_id: "book-1",
          position: 1024,
        }),
      ],
    );

    expect(tree.map((node) => ({ kind: node.kind, id: node.id }))).toEqual([
      { kind: "whiteboard", id: "board" },
      { kind: "document", id: "page" },
    ]);
  });

  it("nests a whiteboard below its document and keeps it a leaf", () => {
    const tree = buildBookOutlineTree(
      [
        makeDocument({ id: "parent" }),
        makeDocument({ id: "child", parent_document_id: "parent" }),
      ],
      [
        makeWhiteboard({
          id: "board",
          collection_id: null,
          book_id: "book-1",
          parent_document_id: "parent",
        }),
      ],
    );

    const parent = tree[0];
    expect(parent?.kind).toBe("document");
    if (parent?.kind !== "document") throw new Error("Expected parent");
    expect(parent.children.map((node) => node.id)).toEqual(["child", "board"]);
    expect(parent.children[1]?.kind).toBe("whiteboard");
  });
});
