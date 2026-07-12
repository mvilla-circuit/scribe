import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeCollection } from "@/test/fixtures";

import type { GalleryChild } from "./collection-gallery";
import { CollectionListRow } from "./collection-list-row";

function collectionChild(
  overrides: Parameters<typeof makeCollection>[0] = {},
): GalleryChild {
  const collection = makeCollection({
    id: "c1",
    name: "The Realm",
    ...overrides,
  });
  return {
    kind: "collection",
    id: collection.id,
    position: collection.position,
    created_at: collection.created_at,
    collection,
  };
}

describe("CollectionListRow", () => {
  it("shows truncated tags on collection list rows", () => {
    render(
      <CollectionListRow
        child={collectionChild()}
        onOpen={vi.fn()}
        tags={[
          { id: "t1", name: "Fantasy", color: "sky" },
          { id: "t2", name: "Epic", color: "moss" },
          { id: "t3", name: "Series", color: "clay" },
        ]}
      />,
    );

    expect(screen.getByText("Fantasy")).toBeInTheDocument();
    expect(screen.getByText("Epic")).toBeInTheDocument();
    expect(screen.queryByText("Series")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("omits the tag row when there are no tags", () => {
    render(
      <CollectionListRow
        child={collectionChild()}
        onOpen={vi.fn()}
        tags={[]}
      />,
    );

    expect(
      screen.queryByTestId("collection-list-row-tags"),
    ).not.toBeInTheDocument();
  });
});
