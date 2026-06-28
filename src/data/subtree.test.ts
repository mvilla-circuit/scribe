import { describe, expect, it } from "vitest";

import { collectSubtree } from "./subtree";

interface Node {
  id: string;
  parentId: string | null;
}

const node = (id: string, parentId: string | null): Node => ({ id, parentId });
const getParentId = (n: Node) => n.parentId;

describe("collectSubtree", () => {
  it("returns just the root when it has no children", () => {
    const items = [node("root", null), node("other", null)];
    expect(collectSubtree(items, "root", getParentId)).toEqual(
      new Set(["root"]),
    );
  });

  it("walks a deep chain of descendants", () => {
    const items = [
      node("a", null),
      node("b", "a"),
      node("c", "b"),
      node("d", "c"),
    ];
    expect(collectSubtree(items, "a", getParentId)).toEqual(
      new Set(["a", "b", "c", "d"]),
    );
  });

  it("collects every branch beneath the root", () => {
    const items = [
      node("root", null),
      node("left", "root"),
      node("right", "root"),
      node("leftChild", "left"),
    ];
    expect(collectSubtree(items, "root", getParentId)).toEqual(
      new Set(["root", "left", "right", "leftChild"]),
    );
  });

  it("ignores nodes outside the requested subtree", () => {
    const items = [
      node("root", null),
      node("child", "root"),
      node("sibling", null),
      node("siblingChild", "sibling"),
    ];
    const subtree = collectSubtree(items, "root", getParentId);
    expect(subtree).toEqual(new Set(["root", "child"]));
    expect(subtree.has("sibling")).toBe(false);
    expect(subtree.has("siblingChild")).toBe(false);
  });

  it("starts from a subtree root even when the list has unrelated parents", () => {
    const items = [
      node("a", null),
      node("b", "a"),
      node("c", "b"),
      node("x", null),
    ];
    expect(collectSubtree(items, "b", getParentId)).toEqual(
      new Set(["b", "c"]),
    );
  });

  it("terminates on a corrupt cyclic parent link (a -> b -> a)", () => {
    // b's parent is a and a's parent is b, so the children map links them both
    // ways. The cycle guard must stop the walk instead of looping forever.
    const items = [node("a", "b"), node("b", "a")];
    expect(collectSubtree(items, "a", getParentId)).toEqual(
      new Set(["a", "b"]),
    );
  });
});
