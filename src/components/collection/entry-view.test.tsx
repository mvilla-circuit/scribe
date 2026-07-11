import { fireEvent, screen } from "@testing-library/react";
import { forwardRef, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { EntryView } from "./entry-view";

const hooks = vi.hoisted(() => ({
  rename: { mutate: vi.fn() },
  update: { mutate: vi.fn() },
  updateContent: { mutateAsync: vi.fn() },
  entryCollectionId: "c1",
}));

vi.mock("@/data/entries", () => ({
  useEntries: () => ({
    data: [
      {
        id: "e1",
        user_id: "user-1",
        collection_id: hooks.entryCollectionId,
        title: "Field notes",
        icon: null,
        cover_url: null,
        properties: {},
        position: 1024,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    isLoading: false,
    isError: false,
  }),
  useEntryContent: () => ({ data: {}, isSuccess: true }),
  useRenameEntry: () => hooks.rename,
  useUpdateEntry: () => hooks.update,
  useUpdateEntryContent: () => hooks.updateContent,
}));

vi.mock("@/data/collections", () => ({
  useCollections: () => ({
    data: [
      { id: "c1", name: "Research" },
      { id: "c2", name: "Archive" },
    ],
  }),
}));

vi.mock("@/editor/lazy-editor", () => ({
  Editor: forwardRef<unknown, Record<string, unknown>>(function EditorStub() {
    return <div className="scribe-prose" data-testid="scribe-editor" />;
  }),
}));

vi.mock("@/components/book/editor-bridge-host", () => ({
  EditorBridgeHost: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/book/masthead", () => ({
  Masthead: ({ children }: { children: ReactNode }) => (
    <header>{children}</header>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  hooks.entryCollectionId = "c1";
});

describe("EntryView", () => {
  it("renders title and editor", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("textbox", { name: "Document title" })).toHaveValue(
      "Field notes",
    );
    expect(screen.getByTestId("scribe-editor")).toBeInTheDocument();
  });

  it("renaming commits via rename mutation", () => {
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    const title = screen.getByRole("textbox", { name: "Document title" });
    fireEvent.change(title, { target: { value: "Archive notes" } });
    fireEvent.blur(title);

    expect(hooks.rename.mutate).toHaveBeenCalledWith({
      id: "e1",
      title: "Archive notes",
    });
  });

  it("breadcrumbs the entry's collection even when the store prop is stale", () => {
    hooks.entryCollectionId = "c2";
    renderWithProviders(<EntryView collectionId="c1" entryId="e1" />);

    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Research" }),
    ).not.toBeInTheDocument();
  });
});
