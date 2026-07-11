import { screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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
vi.mock("./collection/entry-view", () => ({
  EntryView: ({
    collectionId,
    entryId,
  }: {
    collectionId: string;
    entryId: string;
  }) => (
    <div
      data-testid="entry-view"
      data-collection-id={collectionId}
      data-entry-id={entryId}
    />
  ),
}));
vi.mock("./book/book-view", () => ({
  BookView: () => <div data-testid="book-view" />,
}));
vi.mock("./main-empty-state", () => ({
  MainEmptyState: () => <div data-testid="empty-state" />,
}));
vi.mock("./datagrid/datagrid-page", () => ({
  DatagridPage: ({ datagridId }: { datagridId: string }) => (
    <div data-testid="datagrid-page" data-datagrid-id={datagridId} />
  ),
}));
vi.mock("./datagrid/datagrid-row-full", () => ({
  DatagridRowFull: ({
    datagridId,
    rowId,
  }: {
    datagridId: string;
    rowId: string;
  }) => (
    <div
      data-testid="datagrid-row-full"
      data-datagrid-id={datagridId}
      data-row-id={rowId}
    />
  ),
}));
vi.mock("./whiteboard/whiteboard-page", () => ({
  WhiteboardPage: ({ whiteboardId }: { whiteboardId: string }) => (
    <div data-testid="whiteboard-page" data-whiteboard-id={whiteboardId} />
  ),
}));

// Only the props a given case exercises are set; the rest default to the
// "nothing active" baseline so each test reads as a single routing decision.
const props = (
  over: Partial<ComponentProps<typeof MainPane>> = {},
): ComponentProps<typeof MainPane> => ({
  activeBook: null,
  activeCollectionId: null,
  activeEntryId: null,
  activeDatagridId: null,
  activeDatagridRowId: null,
  activeWhiteboardId: null,
  rowOpenMode: "modal",
  ...over,
});

describe("MainPane routing", () => {
  it("falls back to CollectionPage when only a collection is active", () => {
    renderWithProviders(<MainPane {...props({ activeCollectionId: "c1" })} />);
    expect(screen.getByTestId("collection-page")).toHaveAttribute(
      "data-collection-id",
      "c1",
    );
    expect(screen.queryByTestId("book-view")).toBeNull();
  });

  it("renders EntryView when an entry is active", () => {
    renderWithProviders(
      <MainPane
        {...props({ activeCollectionId: "c1", activeEntryId: "e1" })}
      />,
    );

    expect(screen.getByTestId("entry-view")).toHaveAttribute(
      "data-collection-id",
      "c1",
    );
    expect(screen.getByTestId("entry-view")).toHaveAttribute(
      "data-entry-id",
      "e1",
    );
    expect(screen.queryByTestId("collection-page")).toBeNull();
  });

  it("prefers the collection surface over an active book", () => {
    renderWithProviders(
      <MainPane
        {...props({
          activeBook: makeBook({ id: "b1" }),
          activeCollectionId: "c1",
        })}
      />,
    );
    expect(screen.getByTestId("collection-page")).toBeInTheDocument();
    expect(screen.queryByTestId("book-view")).toBeNull();
  });

  it("renders the book view when only a book is active", () => {
    renderWithProviders(
      <MainPane {...props({ activeBook: makeBook({ id: "b1" }) })} />,
    );
    expect(screen.getByTestId("book-view")).toBeInTheDocument();
    expect(screen.queryByTestId("collection-page")).toBeNull();
  });

  it("shows the empty state when nothing is active", () => {
    renderWithProviders(<MainPane {...props()} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders the datagrid page when a datagrid is active", () => {
    renderWithProviders(<MainPane {...props({ activeDatagridId: "dg1" })} />);
    expect(screen.getByTestId("datagrid-page")).toHaveAttribute(
      "data-datagrid-id",
      "dg1",
    );
  });

  it("renders WhiteboardPage for activeWhiteboardId", () => {
    renderWithProviders(
      <MainPane {...props({ activeWhiteboardId: "whiteboard-1" })} />,
    );

    expect(screen.getByTestId("whiteboard-page")).toHaveAttribute(
      "data-whiteboard-id",
      "whiteboard-1",
    );
    expect(screen.queryByTestId("collection-page")).toBeNull();
    expect(screen.queryByTestId("book-view")).toBeNull();
  });

  it("prefers the datagrid page over collection and entry surfaces", () => {
    renderWithProviders(
      <MainPane
        {...props({
          activeDatagridId: "dg1",
          activeCollectionId: "c1",
          activeEntryId: "e1",
        })}
      />,
    );
    expect(screen.getByTestId("datagrid-page")).toBeInTheDocument();
    expect(screen.queryByTestId("entry-view")).toBeNull();
    expect(screen.queryByTestId("collection-page")).toBeNull();
  });

  it("renders the full-row surface when a row is open in full mode", () => {
    renderWithProviders(
      <MainPane
        {...props({
          activeDatagridId: "dg1",
          activeDatagridRowId: "r1",
          rowOpenMode: "full",
        })}
      />,
    );
    expect(screen.getByTestId("datagrid-row-full")).toHaveAttribute(
      "data-row-id",
      "r1",
    );
    expect(screen.queryByTestId("datagrid-page")).toBeNull();
  });

  it("keeps the datagrid page (not the full row) for modal/split open modes", () => {
    renderWithProviders(
      <MainPane
        {...props({
          activeDatagridId: "dg1",
          activeDatagridRowId: "r1",
          rowOpenMode: "split",
        })}
      />,
    );
    expect(screen.getByTestId("datagrid-page")).toBeInTheDocument();
    expect(screen.queryByTestId("datagrid-row-full")).toBeNull();
  });
});
