import { describe, expect, it } from "vitest";

import type { PageIndexEntry } from "@/data/page-index";
import { makeBook } from "@/test/fixtures";

import { buildPageLinkOptions, resolvePageTarget } from "./page-link-resolve";

function entry(overrides: Partial<PageIndexEntry> = {}): PageIndexEntry {
  return {
    id: "doc-1",
    title: "Doc 1",
    icon: null,
    book_id: "book-1",
    parent_document_id: null,
    is_title_page: false,
    ...overrides,
  };
}

describe("resolvePageTarget", () => {
  it("returns null for a null target id", () => {
    expect(resolvePageTarget([], [], "document", null)).toBeNull();
  });

  it("resolves a book target to its title, icon, and a 'Book' breadcrumb", () => {
    const books = [makeBook({ id: "b1", title: "My Book", icon: "📕" })];

    const resolved = resolvePageTarget(books, [], "book", "b1");

    expect(resolved).toEqual({
      title: "My Book",
      icon: "📕",
      fallbackGlyph: "book",
      breadcrumb: "Book",
      bookId: "b1",
      docId: null,
    });
  });

  it("returns null when the book target is missing", () => {
    expect(resolvePageTarget([], [], "book", "missing")).toBeNull();
  });

  it("resolves a top-level document with a book-only breadcrumb", () => {
    const books = [makeBook({ id: "b1", title: "My Book" })];
    const index = [entry({ id: "d1", title: "Intro", book_id: "b1" })];

    const resolved = resolvePageTarget(books, index, "document", "d1");

    expect(resolved).toMatchObject({
      title: "Intro",
      breadcrumb: "My Book",
      bookId: "b1",
      docId: "d1",
      fallbackGlyph: "page",
    });
  });

  it("builds a nested breadcrumb from the ancestor chain, skipping title pages", () => {
    const books = [makeBook({ id: "b1", title: "Book" })];
    const index = [
      entry({ id: "title", book_id: "b1", is_title_page: true }),
      entry({
        id: "parent",
        title: "Parent",
        book_id: "b1",
        parent_document_id: "title",
      }),
      entry({
        id: "child",
        title: "Child",
        book_id: "b1",
        parent_document_id: "parent",
      }),
    ];

    const resolved = resolvePageTarget(books, index, "document", "child");

    expect(resolved?.breadcrumb).toBe("Book / Parent");
    expect(resolved?.docId).toBe("child");
  });

  it("uses the book title for a title-page document and reports docId null", () => {
    const books = [makeBook({ id: "b1", title: "Book Title" })];
    const index = [
      entry({ id: "title", title: "", book_id: "b1", is_title_page: true }),
    ];

    const resolved = resolvePageTarget(books, index, "document", "title");

    expect(resolved?.title).toBe("Book Title");
    expect(resolved?.docId).toBeNull();
  });

  it("returns null when the document target is missing from the index", () => {
    expect(resolvePageTarget([], [], "document", "nope")).toBeNull();
  });

  it("does not loop on a cyclic parent chain", () => {
    const books = [makeBook({ id: "b1", title: "Book" })];
    const index = [
      entry({ id: "a", title: "A", parent_document_id: "b" }),
      entry({ id: "b", title: "B", parent_document_id: "a" }),
    ];

    // Should terminate (guard against cycles) rather than hang.
    const resolved = resolvePageTarget(books, index, "document", "a");
    expect(resolved?.docId).toBe("a");
  });
});

describe("buildPageLinkOptions", () => {
  it("lists every book and non-title page, with the book title as a page subtitle", () => {
    const books = [makeBook({ id: "b1", title: "Book One", icon: "📘" })];
    const index = [
      entry({ id: "title", book_id: "b1", is_title_page: true }),
      entry({ id: "d1", title: "Page One", book_id: "b1", icon: "📄" }),
    ];

    const options = buildPageLinkOptions(books, index);

    expect(options).toEqual([
      {
        targetType: "book",
        targetId: "b1",
        label: "Book One",
        icon: "📘",
        glyph: "book",
        subtitle: "Book",
      },
      {
        targetType: "document",
        targetId: "d1",
        label: "Page One",
        icon: "📄",
        glyph: "page",
        subtitle: "Book One",
      },
    ]);
  });

  it("excludes title pages (they are represented by their book row)", () => {
    const books = [makeBook({ id: "b1", title: "Book" })];
    const index = [entry({ id: "title", book_id: "b1", is_title_page: true })];

    const options = buildPageLinkOptions(books, index);

    expect(options.map((o) => o.targetId)).toEqual(["b1"]);
  });
});
