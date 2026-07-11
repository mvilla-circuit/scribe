import { describe, expect, it } from "vitest";

import type { TreeChild } from "@/data/tree";
import { makeBook, makeCollection, makeEntry } from "@/test/fixtures";

import {
  filterGalleryChildren,
  sortGalleryChildren,
} from "./collection-gallery";

function collectionChild(
  overrides: Parameters<typeof makeCollection>[0] = {},
): TreeChild {
  const collection = makeCollection({
    id: "c-side",
    name: "Side quest",
    updated_at: "2026-01-02T00:00:00.000Z",
    position: 300,
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

function bookChild(overrides: Parameters<typeof makeBook>[0] = {}): TreeChild {
  const book = makeBook({
    id: "b-notes",
    title: "Field notes",
    updated_at: "2026-01-03T00:00:00.000Z",
    position: 100,
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

function entryChild(
  overrides: Parameters<typeof makeEntry>[0] = {},
): TreeChild {
  const entry = makeEntry({
    id: "e-alpha",
    title: "Alpha doc",
    updated_at: "2026-01-01T00:00:00.000Z",
    position: 200,
    ...overrides,
  });
  return {
    kind: "entry",
    id: entry.id,
    position: entry.position,
    created_at: entry.created_at,
    entry,
  };
}

describe("sortGalleryChildren", () => {
  it("orders children alphabetically by title", () => {
    const children = [
      bookChild({ title: "Zeta", id: "z" }),
      entryChild({ title: "Alpha", id: "a" }),
      collectionChild({ name: "Middle", id: "m" }),
    ];
    expect(sortGalleryChildren(children).map((child) => child.id)).toEqual([
      "a",
      "m",
      "z",
    ]);
  });
});

describe("filterGalleryChildren", () => {
  const children = [
    collectionChild(),
    bookChild(),
    entryChild({ title: "Project notes", id: "e-notes" }),
  ];

  it("filters children by case-insensitive title", () => {
    expect(
      filterGalleryChildren(children, "PROJECT").map((child) => child.id),
    ).toEqual(["e-notes"]);
  });

  it("returns all gallery children for an empty query", () => {
    expect(
      filterGalleryChildren(children, "").map((child) => child.id),
    ).toEqual(["c-side", "b-notes", "e-notes"]);
  });
});
