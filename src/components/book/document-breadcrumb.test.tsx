import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeBook, makeDocument } from "@/test/fixtures";

import { DocumentBreadcrumb } from "./document-breadcrumb";

describe("DocumentBreadcrumb", () => {
  const book = makeBook({
    id: "book-1",
    title: "Catechism of the Catholic Church, 2nd Edition",
  });
  const parent = makeDocument({
    id: "parent-1",
    book_id: "book-1",
    title: "Prologue",
  });
  const current = makeDocument({
    id: "current-1",
    book_id: "book-1",
    parent_document_id: "parent-1",
    title: "VI. Necessary Adaptations",
  });
  const documents = [parent, current];

  function renderBreadcrumb() {
    render(
      <DocumentBreadcrumb
        book={book}
        document={current}
        documents={documents}
        onNavigate={vi.fn()}
      />,
    );
  }

  it("applies truncation to the book title item", () => {
    renderBreadcrumb();
    const bookButton = screen.getByRole("button", { name: book.title });
    expect(bookButton.className).toContain("truncate");
    expect(bookButton.className).toContain("min-w-0");
  });

  it("truncates ancestor and current-page items", () => {
    renderBreadcrumb();
    const ancestorButton = screen.getByRole("button", { name: parent.title });
    expect(ancestorButton.className).toContain("truncate");
    expect(ancestorButton.className).toContain("min-w-0");

    const currentItem = screen.getByText(current.title);
    expect(currentItem.className).toContain("truncate");
    expect(currentItem.className).toContain("min-w-0");
  });

  it("keeps separators from shrinking", () => {
    renderBreadcrumb();
    const separators = screen.getAllByText("/");
    expect(separators.length).toBeGreaterThan(0);
    for (const sep of separators) {
      expect(sep.className).toContain("shrink-0");
    }
  });
});
