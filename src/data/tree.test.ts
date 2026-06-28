import { describe, expect, it } from "vitest";

import { makeBook, makeFolder } from "@/test/fixtures";

import { buildTree, childrenOf, countBooksInFolder, ROOT } from "./tree";

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
