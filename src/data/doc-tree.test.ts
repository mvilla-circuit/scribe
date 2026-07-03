import { describe, expect, it } from "vitest";

import { makeDocument } from "@/test/fixtures";

import {
  buildDocTree,
  descendantCount,
  documentAncestors,
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

  it("scopes to a rootId subtree, returning that document's children as roots", () => {
    const tree = buildDocTree(
      [
        makeDocument({ id: "ch1", position: 1024 }),
        makeDocument({ id: "ch1a", parent_document_id: "ch1", position: 1024 }),
        makeDocument({
          id: "ch1a1",
          parent_document_id: "ch1a",
          position: 1024,
        }),
        makeDocument({ id: "ch1b", parent_document_id: "ch1", position: 2048 }),
        makeDocument({ id: "ch2", position: 2048 }),
      ],
      "ch1",
    );

    expect(tree.map((n) => n.document.id)).toEqual(["ch1a", "ch1b"]);
    expect(tree[0]?.children.map((n) => n.document.id)).toEqual(["ch1a1"]);
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

describe("documentAncestors", () => {
  it("returns an empty chain for a top-level document", () => {
    const doc = makeDocument({ id: "ch1", parent_document_id: null });
    expect(documentAncestors([doc], doc)).toEqual([]);
  });

  it("walks the parent chain root-first", () => {
    const root = makeDocument({ id: "root" });
    const mid = makeDocument({ id: "mid", parent_document_id: "root" });
    const leaf = makeDocument({ id: "leaf", parent_document_id: "mid" });
    expect(documentAncestors([leaf, mid, root], leaf).map((d) => d.id)).toEqual(
      ["root", "mid"],
    );
  });

  it("stops at (and excludes) the title page", () => {
    const title = makeDocument({ id: "title", is_title_page: true });
    const root = makeDocument({ id: "root", parent_document_id: "title" });
    const leaf = makeDocument({ id: "leaf", parent_document_id: "root" });
    expect(
      documentAncestors([title, root, leaf], leaf).map((d) => d.id),
    ).toEqual(["root"]);
  });

  it("stops when a parent link is missing", () => {
    const leaf = makeDocument({ id: "leaf", parent_document_id: "gone" });
    expect(documentAncestors([leaf], leaf)).toEqual([]);
  });

  it("does not loop on a cyclic parent chain", () => {
    const a = makeDocument({ id: "a", parent_document_id: "b" });
    const b = makeDocument({ id: "b", parent_document_id: "a" });
    // Terminates via the cycle guard rather than hanging (it unshifts b then a
    // before re-encountering b and stopping).
    expect(documentAncestors([a, b], a).map((d) => d.id)).toEqual(["a", "b"]);
  });
});
