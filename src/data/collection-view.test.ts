import { describe, expect, it } from "vitest";

import {
  type CollectionLayout,
  parseCollectionView,
  serializeCollectionView,
} from "./collection-view";

describe("parseCollectionView", () => {
  it("returns the grid default for invalid input", () => {
    expect(parseCollectionView(null)).toEqual({ layout: "grid" });
    expect(parseCollectionView("list")).toEqual({ layout: "grid" });
    expect(parseCollectionView({ layout: "invalid" })).toEqual({
      layout: "grid",
    });
  });

  it("keeps only supported layout values and ignores legacy sort", () => {
    expect(
      parseCollectionView({
        layout: "list",
        sort: "updated",
        ignored: "value",
      }),
    ).toEqual({ layout: "list" });
  });
});

describe("serializeCollectionView", () => {
  it("returns a JSON-ready collection view", () => {
    const layout: CollectionLayout = "list";
    expect(serializeCollectionView({ layout })).toEqual({ layout });
  });
});
