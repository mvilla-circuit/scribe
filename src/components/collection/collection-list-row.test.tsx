import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeBook, makeCollection } from "@/test/fixtures";

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

function bookChild(
  overrides: Parameters<typeof makeBook>[0] = {},
): GalleryChild {
  const book = makeBook({
    id: "b1",
    title: "First Light",
    ...overrides,
  });
  return {
    kind: "book",
    id: book.id,
    position: book.position,
    created_at: book.created_at,
    book,
  };
}

describe("CollectionListRow", () => {
  it("shows the subtitle instead of the kind label", () => {
    render(
      <CollectionListRow
        child={collectionChild({
          description: "The daughters of a Queen are forced to uphold…",
        })}
        onOpen={vi.fn()}
      />,
    );

    expect(
      screen.getByText("The daughters of a Queen are forced to uphold…"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Collection")).not.toBeInTheDocument();
  });

  it("omits the subtitle row when none is set", () => {
    render(
      <CollectionListRow
        child={bookChild({ subtitle: null })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByText("Book")).not.toBeInTheDocument();
    expect(screen.getByText("First Light")).toBeInTheDocument();
  });

  it("puts tags on their own line under the subtitle", () => {
    render(
      <CollectionListRow
        child={collectionChild({ description: "An epic cycle" })}
        onOpen={vi.fn()}
        tags={[
          { id: "t1", name: "Fantasy", color: "sky" },
          { id: "t2", name: "Epic", color: "moss" },
          { id: "t3", name: "Series", color: "clay" },
        ]}
      />,
    );

    const subtitle = screen.getByText("An epic cycle");
    const tags = screen.getByTestId("collection-list-row-tags");
    expect(
      subtitle.compareDocumentPosition(tags) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Fantasy")).toBeInTheDocument();
    expect(screen.getByText("Epic")).toBeInTheDocument();
    expect(screen.getByText("Series")).toBeInTheDocument();
    expect(screen.queryByText("+1")).not.toBeInTheDocument();
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

  it("fills the left cap with the cover when one exists", () => {
    render(
      <CollectionListRow
        child={collectionChild({
          cover_url: "https://example.test/realm.jpg",
          icon: "lucide:crown",
        })}
        onOpen={vi.fn()}
      />,
    );

    const cover = screen.getByTestId("list-row-cover");
    expect(cover).toHaveAttribute("src", "https://example.test/realm.jpg");
    expect(screen.getByTestId("list-row-media")).toContainElement(cover);
  });

  it("falls back to the icon in the left cap when there is no cover", () => {
    render(
      <CollectionListRow
        child={collectionChild({
          cover_url: null,
          icon: "lucide:crown",
        })}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("list-row-cover")).not.toBeInTheDocument();
    expect(screen.getByTestId("list-row-media")).toBeInTheDocument();
  });
});
