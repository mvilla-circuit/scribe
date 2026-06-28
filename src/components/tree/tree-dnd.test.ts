import { describe, expect, it } from "vitest";

import {
  type DndNode,
  INDENT,
  neighbourPositions,
  projectDrop,
  type ProjectionConfig,
  removeDescendants,
} from "./tree-dnd";

const node = (
  id: string,
  depth: number,
  parentId: string | null,
  position: number,
): DndNode => ({ id, depth, parentId, position });

// "Any node may be a parent" config (the in-book outline variant), which makes
// the depth maths easy to reason about in isolation.
const nestableConfig: ProjectionConfig<DndNode> = {
  maxDepthForPrev: (prev) => prev.depth + 1,
  parentWhenNestedUnder: (prev) => prev.id,
};

describe("removeDescendants", () => {
  it("drops every descendant of the excluded ids but keeps the ids themselves", () => {
    const nodes = [
      { id: "a", parentId: null },
      { id: "b", parentId: "a" },
      { id: "c", parentId: "b" },
      { id: "d", parentId: null },
    ];
    expect(removeDescendants(nodes, ["a"])).toEqual([
      { id: "a", parentId: null },
      { id: "d", parentId: null },
    ]);
  });

  it("keeps everything when the excluded id has no children", () => {
    const nodes = [
      { id: "a", parentId: null },
      { id: "b", parentId: null },
    ];
    expect(removeDescendants(nodes, ["a"])).toEqual(nodes);
  });
});

describe("projectDrop", () => {
  const nodes = [
    node("a", 0, null, 1024),
    node("b", 0, null, 2048),
    node("c", 0, null, 3072),
  ];

  it("returns null when either id is missing from the list", () => {
    expect(projectDrop(nodes, "missing", "a", 0, nestableConfig)).toBeNull();
    expect(projectDrop(nodes, "a", "missing", 0, nestableConfig)).toBeNull();
  });

  it("nests one level under the preceding row when dragged right", () => {
    const projection = projectDrop(nodes, "c", "b", INDENT, nestableConfig);
    expect(projection).toEqual({ depth: 1, parentId: "a" });
  });

  it("stays at root depth when there is no horizontal drag", () => {
    const projection = projectDrop(nodes, "c", "b", 0, nestableConfig);
    expect(projection).toEqual({ depth: 0, parentId: null });
  });

  it("clamps the projected depth to what the previous row allows", () => {
    const projection = projectDrop(nodes, "c", "b", INDENT * 5, nestableConfig);
    expect(projection).toEqual({ depth: 1, parentId: "a" });
  });

  it("honours a fixedProjection (folder-style rows pinned to root)", () => {
    const pinned: ProjectionConfig<DndNode> = {
      ...nestableConfig,
      fixedProjection: () => ({ depth: 0, parentId: null }),
    };
    const projection = projectDrop(nodes, "c", "b", INDENT * 3, pinned);
    expect(projection).toEqual({ depth: 0, parentId: null });
  });
});

describe("neighbourPositions", () => {
  const nodes = [
    node("a", 0, null, 1024),
    node("b", 0, null, 2048),
    node("c", 0, null, 3072),
  ];

  it("reports both neighbours when dropped between two same-parent rows", () => {
    expect(neighbourPositions(nodes, "a", "b", null)).toEqual({
      prev: 2048,
      next: 3072,
    });
  });

  it("omits the missing side when dropped at an edge", () => {
    expect(neighbourPositions(nodes, "a", "c", null)).toEqual({ prev: 3072 });
  });

  it("returns nothing when an id is not in the list", () => {
    expect(neighbourPositions(nodes, "a", "missing", null)).toEqual({});
  });
});
