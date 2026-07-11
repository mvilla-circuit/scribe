import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeBook } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { MainPane } from "./main-pane";

// The empty state and book view reach for auth/session context; the derivation
// under test only needs the routing decision, so stub the session.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ session: { user: { id: "user-1" } } }),
}));

// Isolate the routing decision from the child surfaces' own data-fetching: stub
// them to lightweight markers so this test asserts only which surface renders,
// regardless of how the real collection page / book view are built.
vi.mock("./collection/collection-page", () => ({
  CollectionPage: ({ collectionId }: { collectionId: string }) => (
    <div data-testid="collection-page" data-collection-id={collectionId} />
  ),
}));
vi.mock("./book/book-view", () => ({
  BookView: () => <div data-testid="book-view" />,
}));
vi.mock("./main-empty-state", () => ({
  MainEmptyState: () => <div data-testid="empty-state" />,
}));

describe("MainPane routing", () => {
  it("renders the collection page when a collection is active", () => {
    renderWithProviders(<MainPane activeBook={null} activeCollectionId="c1" />);
    expect(screen.getByTestId("collection-page")).toHaveAttribute(
      "data-collection-id",
      "c1",
    );
    expect(screen.queryByTestId("book-view")).toBeNull();
  });

  it("prefers the collection surface over an active book", () => {
    renderWithProviders(
      <MainPane activeBook={makeBook({ id: "b1" })} activeCollectionId="c1" />,
    );
    expect(screen.getByTestId("collection-page")).toBeInTheDocument();
    expect(screen.queryByTestId("book-view")).toBeNull();
  });

  it("renders the book view when only a book is active", () => {
    renderWithProviders(
      <MainPane
        activeBook={makeBook({ id: "b1" })}
        activeCollectionId={null}
      />,
    );
    expect(screen.getByTestId("book-view")).toBeInTheDocument();
    expect(screen.queryByTestId("collection-page")).toBeNull();
  });

  it("shows the empty state when nothing is active", () => {
    renderWithProviders(
      <MainPane activeBook={null} activeCollectionId={null} />,
    );
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});
