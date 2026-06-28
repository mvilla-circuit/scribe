import { describe, expect, it } from "vitest";

import { makeDocument } from "@/test/fixtures";

import {
  buildDocTree,
  descendantCount,
  expandableDocIds,
  flattenTocExpanded,
} from "./doc-tree";

describe("buildDocTree", () => {
  it("excludes the title page and nests children under parents, sorted by position", () => {
    const tree = buildDocTree([
      makeDocument({ id: "title", is_title_page: true }),
      makeDocument({ id: "ch2", position: 2048 }),
      makeDocument({ id: "ch1", position: 1024 }),
      makeDocument({ id: "ch1a", parent_document_id: "ch1", position: 1024 }),
    ]);

    expect(tree.map((n) => n.document.id)).toEqual(["ch1", "ch2"]);
    expect(tree[0]?.children.map((n) => n.document.id)).toEqual(["ch1a"]);
  });

  it("treats a document whose parent is missing or a title page as a root", () => {
    const tree = buildDocTree([
      makeDocument({ id: "title", is_title_page: true }),
      makeDocument({ id: "orphan", parent_document_id: "title" }),
      makeDocument({ id: "lost", parent_document_id: "does-not-exist" }),
    ]);
    expect(tree.map((n) => n.document.id).sort()).toEqual(["lost", "orphan"]);
  });
});

describe("flattenTocExpanded", () => {
  const docs = [
    makeDocument({ id: "ch1", position: 1024 }),
    makeDocument({ id: "ch1a", parent_document_id: "ch1", position: 1024 }),
    makeDocument({ id: "ch2", position: 2048 }),
  ];

  it("hides children of collapsed parents", () => {
    const tree = buildDocTree(docs);
    const rows = flattenTocExpanded(tree, new Set());
    expect(rows.map((r) => r.document.id)).toEqual(["ch1", "ch2"]);
    expect(rows[0]).toMatchObject({ depth: 0, hasChildren: true });
  });

  it("descends into expanded parents and tags depth", () => {
    const tree = buildDocTree(docs);
    const rows = flattenTocExpanded(tree, new Set(["ch1"]));
    expect(rows.map((r) => ({ id: r.document.id, depth: r.depth }))).toEqual([
      { id: "ch1", depth: 0 },
      { id: "ch1a", depth: 1 },
      { id: "ch2", depth: 0 },
    ]);
  });
});

describe("expandableDocIds", () => {
  it("lists every node that has children", () => {
    const tree = buildDocTree([
      makeDocument({ id: "ch1", position: 1024 }),
      makeDocument({ id: "ch1a", parent_document_id: "ch1" }),
      makeDocument({ id: "ch2", position: 2048 }),
    ]);
    expect(expandableDocIds(tree)).toEqual(["ch1"]);
  });
});

describe("descendantCount", () => {
  it("counts descendants excluding the document itself", () => {
    const docs = [
      makeDocument({ id: "ch1" }),
      makeDocument({ id: "ch1a", parent_document_id: "ch1" }),
      makeDocument({ id: "ch1a1", parent_document_id: "ch1a" }),
      makeDocument({ id: "ch2" }),
    ];
    expect(descendantCount(docs, "ch1")).toBe(2);
    expect(descendantCount(docs, "ch2")).toBe(0);
  });
});
