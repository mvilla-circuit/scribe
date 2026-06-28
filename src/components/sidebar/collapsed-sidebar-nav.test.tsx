import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { booksKey, documentsKey, foldersKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeDocument } from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { CollapsedSidebarNav } from "./collapsed-sidebar-nav";

const BOOK = makeBook({ id: "b1", title: "Genesis" });

const resetStore = () =>
  useUIStore.setState({
    sidebarCollapsed: true,
    sidebarWidth: 260,
    activeBookId: null,
    activeDocId: null,
    expandedFolderIds: [],
    expandedDocIds: [],
  });

beforeEach(resetStore);

describe("CollapsedSidebarNav", () => {
  it("renders the Library rail when no book is active", () => {
    const client = createTestQueryClient();
    client.setQueryData(foldersKey, []);
    client.setQueryData(booksKey, [BOOK]);

    renderWithProviders(<CollapsedSidebarNav activeBook={null} />, { client });

    expect(screen.getByRole("button", { name: "Genesis" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Back to library" }),
    ).not.toBeInTheDocument();
  });

  it("renders the in-book outline rail with a Back to library control", () => {
    useUIStore.setState({ activeBookId: "b1" });
    const client = createTestQueryClient();
    client.setQueryData(documentsKey("b1"), [
      makeDocument({ id: "tp", is_title_page: true, position: 0 }),
      makeDocument({ id: "d1", title: "Chapter 1", position: 1024 }),
    ]);

    renderWithProviders(<CollapsedSidebarNav activeBook={BOOK} />, { client });

    expect(
      screen.getByRole("button", { name: "Back to library" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Chapter 1" }),
    ).toBeInTheDocument();
  });

  it("clears the active book when Back to library is clicked", async () => {
    useUIStore.setState({ activeBookId: "b1" });
    const client = createTestQueryClient();
    client.setQueryData(documentsKey("b1"), [
      makeDocument({ id: "tp", is_title_page: true, position: 0 }),
    ]);

    renderWithProviders(<CollapsedSidebarNav activeBook={BOOK} />, { client });
    await userEvent.click(
      screen.getByRole("button", { name: "Back to library" }),
    );

    expect(useUIStore.getState().activeBookId).toBeNull();
  });
});
