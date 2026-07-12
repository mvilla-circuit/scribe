import { describe, expect, it } from "vitest";

import {
  applySectionLabel,
  type CollectionLayout,
  DEFAULT_SECTION_LABELS,
  parseCollectionView,
  sectionLabel,
  serializeCollectionView,
  setSectionLabel,
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

  it("omits sectionLabels when absent", () => {
    expect(parseCollectionView({ layout: "grid" })).toEqual({
      layout: "grid",
    });
    expect(parseCollectionView({ layout: "grid" })).not.toHaveProperty(
      "sectionLabels",
    );
  });

  it("keeps only known kind labels with non-empty strings", () => {
    expect(
      parseCollectionView({
        layout: "grid",
        sectionLabels: {
          book: "  Novels  ",
          entry: "",
          datagrid: "   ",
          unknown: "Nope",
          whiteboard: 12,
          collection: "Archives",
        },
      }),
    ).toEqual({
      layout: "grid",
      sectionLabels: {
        book: "Novels",
        collection: "Archives",
      },
    });
  });

  it("drops section labels equal to the defaults", () => {
    expect(
      parseCollectionView({
        layout: "grid",
        sectionLabels: {
          book: DEFAULT_SECTION_LABELS.book,
          entry: "Chapters",
        },
      }),
    ).toEqual({
      layout: "grid",
      sectionLabels: { entry: "Chapters" },
    });
  });
});

describe("serializeCollectionView", () => {
  it("returns a JSON-ready collection view", () => {
    const layout: CollectionLayout = "list";
    expect(serializeCollectionView({ layout })).toEqual({ layout });
  });

  it("omits empty sectionLabels and keys equal to defaults", () => {
    expect(
      serializeCollectionView({
        layout: "grid",
        sectionLabels: {
          book: DEFAULT_SECTION_LABELS.book,
          entry: "Chapters",
        },
      }),
    ).toEqual({
      layout: "grid",
      sectionLabels: { entry: "Chapters" },
    });

    expect(
      serializeCollectionView({
        layout: "list",
        sectionLabels: { book: DEFAULT_SECTION_LABELS.book },
      }),
    ).toEqual({ layout: "list" });
  });
});

describe("sectionLabel", () => {
  it("returns the override when set, otherwise the default", () => {
    expect(sectionLabel({ layout: "grid" }, "book")).toBe("Books");
    expect(
      sectionLabel(
        { layout: "grid", sectionLabels: { book: "Novels" } },
        "book",
      ),
    ).toBe("Novels");
  });
});

describe("setSectionLabel", () => {
  it("clears empty and default-equal values", () => {
    const withOverride = setSectionLabel({ layout: "grid" }, "book", "Novels");
    expect(withOverride).toEqual({
      layout: "grid",
      sectionLabels: { book: "Novels" },
    });

    expect(setSectionLabel(withOverride, "book", "  ")).toEqual({
      layout: "grid",
    });
    expect(
      setSectionLabel(withOverride, "book", DEFAULT_SECTION_LABELS.book),
    ).toEqual({ layout: "grid" });
  });

  it("clears one override while keeping others", () => {
    const view = {
      layout: "grid" as const,
      sectionLabels: { book: "Novels", entry: "Chapters" },
    };
    expect(setSectionLabel(view, "book", "")).toEqual({
      layout: "grid",
      sectionLabels: { entry: "Chapters" },
    });
  });
});

describe("applySectionLabel", () => {
  it("returns null for no-op clears of an already-default label", () => {
    expect(applySectionLabel({ layout: "grid" }, "book", "")).toBeNull();
    expect(applySectionLabel({ layout: "grid" }, "book", "Books")).toBeNull();
  });

  it("returns the updated view when the label changes", () => {
    expect(applySectionLabel({ layout: "grid" }, "book", "Novels")).toEqual({
      layout: "grid",
      sectionLabels: { book: "Novels" },
    });
  });
});
