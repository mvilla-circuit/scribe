import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { booksKey, foldersKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeFolder } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { CollapsedLibraryRail } from "./collapsed-library-rail";

const failLibraryRequests = () => {
  server.use(
    http.get("http://supabase.test/rest/v1/books", () =>
      HttpResponse.json({ message: "boom" }, { status: 500 }),
    ),
    http.get("http://supabase.test/rest/v1/folders", () =>
      HttpResponse.json({ message: "boom" }, { status: 500 }),
    ),
  );
};

const resetStore = () =>
  useUIStore.setState({
    sidebarCollapsed: false,
    sidebarWidth: 260,
    activeBookId: null,
    activeDocId: null,
    expandedFolderIds: [],
    expandedDocIds: [],
  });

beforeEach(resetStore);

function renderRail(
  seed: (client: ReturnType<typeof createTestQueryClient>) => void,
) {
  const client = createTestQueryClient();
  seed(client);
  return renderWithProviders(<CollapsedLibraryRail />, { client });
}

describe("CollapsedLibraryRail", () => {
  it("renders a button for each root book and folder, in position order", () => {
    renderRail((client) => {
      client.setQueryData(foldersKey, [
        makeFolder({ id: "f1", name: "Archive", position: 2048 }),
      ]);
      client.setQueryData(booksKey, [
        makeBook({ id: "b1", title: "Genesis", position: 1024 }),
      ]);
    });

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Genesis",
      "Archive",
    ]);
  });

  it("marks folders with the subpages indicator but not books", () => {
    renderRail((client) => {
      client.setQueryData(foldersKey, [
        makeFolder({ id: "f1", name: "Archive" }),
      ]);
      client.setQueryData(booksKey, [makeBook({ id: "b1", title: "Genesis" })]);
    });

    expect(
      within(screen.getByRole("button", { name: "Archive" })).getByTestId(
        "rail-indicator",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Genesis" })).queryByTestId(
        "rail-indicator",
      ),
    ).not.toBeInTheDocument();
  });

  it("opens a book when its button is clicked", async () => {
    renderRail((client) => {
      client.setQueryData(foldersKey, []);
      client.setQueryData(booksKey, [makeBook({ id: "b1", title: "Genesis" })]);
    });

    await userEvent.click(screen.getByRole("button", { name: "Genesis" }));

    expect(useUIStore.getState().activeBookId).toBe("b1");
  });

  it("marks the active book's button as current", () => {
    useUIStore.setState({ activeBookId: "b1" });
    renderRail((client) => {
      client.setQueryData(foldersKey, []);
      client.setQueryData(booksKey, [makeBook({ id: "b1", title: "Genesis" })]);
    });

    expect(screen.getByRole("button", { name: "Genesis" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("expands the folder and uncollapses the sidebar when a folder is clicked", async () => {
    useUIStore.setState({ sidebarCollapsed: true });
    renderRail((client) => {
      client.setQueryData(foldersKey, [
        makeFolder({ id: "f1", name: "Archive" }),
      ]);
      client.setQueryData(booksKey, []);
    });

    await userEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(useUIStore.getState().expandedFolderIds).toContain("f1");
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("renders no buttons when the library is empty", () => {
    renderRail((client) => {
      client.setQueryData(foldersKey, []);
      client.setQueryData(booksKey, []);
    });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows an error affordance when the library fails to load", async () => {
    failLibraryRequests();
    renderWithProviders(<CollapsedLibraryRail />, {
      client: createTestQueryClient(),
    });

    expect(
      await screen.findByRole("button", { name: "Couldn't load library" }),
    ).toBeInTheDocument();
  });

  it("expands the sidebar when the error affordance is clicked", async () => {
    useUIStore.setState({ sidebarCollapsed: true });
    failLibraryRequests();
    renderWithProviders(<CollapsedLibraryRail />, {
      client: createTestQueryClient(),
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Couldn't load library" }),
    );

    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});
