import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { documentsKey, whiteboardsKey } from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import { makeBook, makeDocument, makeWhiteboard } from "@/test/fixtures";
import { server } from "@/test/msw/server";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { CollapsedOutlineRail } from "./collapsed-outline-rail";

const BOOK = makeBook({ id: "b1", title: "Genesis" });

const failDocumentRequests = () => {
  server.use(
    http.get("http://supabase.test/rest/v1/documents", () =>
      HttpResponse.json({ message: "boom" }, { status: 500 }),
    ),
  );
};

const resetStore = () =>
  useUIStore.setState({
    sidebarCollapsed: true,
    sidebarWidth: 260,
    activeBookId: "b1",
    activeDocId: null,
    activeWhiteboardId: null,
    expandedFolderIds: [],
    expandedDocIds: [],
  });

beforeEach(resetStore);

function seedDocs() {
  const client = createTestQueryClient();
  client.setQueryData(documentsKey("b1"), [
    makeDocument({ id: "tp", is_title_page: true, position: 0 }),
    makeDocument({ id: "d1", title: "Chapter 1", position: 1024 }),
    makeDocument({
      id: "d1a",
      title: "Section 1.1",
      parent_document_id: "d1",
      position: 512,
    }),
    makeDocument({ id: "d2", title: "Chapter 2", position: 2048 }),
  ]);
  return client;
}

describe("CollapsedOutlineRail", () => {
  it("includes top-level whiteboards and does not select the title page", () => {
    useUIStore.setState({ activeWhiteboardId: "w1" });
    const client = seedDocs();
    client.setQueryData(whiteboardsKey, [
      makeWhiteboard({
        id: "w1",
        collection_id: null,
        book_id: "b1",
        name: "Storyboard",
      }),
    ]);

    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, { client });

    expect(screen.getByRole("button", { name: "Storyboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Genesis" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders the pinned Title Page first, then only top-level pages", () => {
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    const labels = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label"));
    // "Section 1.1" is nested under "Chapter 1" and must not appear.
    expect(labels).toEqual(["Genesis", "Chapter 1", "Chapter 2"]);
  });

  it("selects the Title Page when no document is active", () => {
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    expect(screen.getByRole("button", { name: "Genesis" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks a parent page with the subpages indicator and leaves a leaf without one", () => {
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    expect(
      within(screen.getByRole("button", { name: "Chapter 1" })).getByTestId(
        "rail-indicator",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("button", { name: "Chapter 2" })).queryByTestId(
        "rail-indicator",
      ),
    ).not.toBeInTheDocument();
  });

  it("navigates to a childless page without expanding the sidebar", async () => {
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    await userEvent.click(screen.getByRole("button", { name: "Chapter 2" }));

    expect(useUIStore.getState().activeDocId).toBe("d2");
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    expect(useUIStore.getState().expandedDocIds).not.toContain("d2");
  });

  it("opens a parent page: navigates, expands the sidebar, and expands its subpages", async () => {
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    await userEvent.click(screen.getByRole("button", { name: "Chapter 1" }));

    expect(useUIStore.getState().activeDocId).toBe("d1");
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    expect(useUIStore.getState().expandedDocIds).toContain("d1");
  });

  it("opens the Title Page when its button is clicked", async () => {
    useUIStore.setState({ activeDocId: "d2" });
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    await userEvent.click(screen.getByRole("button", { name: "Genesis" }));

    expect(useUIStore.getState().activeDocId).toBe("tp");
  });

  it("marks the active page as current", () => {
    useUIStore.setState({ activeDocId: "d1" });
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    expect(screen.getByRole("button", { name: "Chapter 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "Genesis" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("selects the top-level ancestor when a nested subpage is active", () => {
    useUIStore.setState({ activeDocId: "d1a" });
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: seedDocs(),
    });

    expect(screen.getByRole("button", { name: "Chapter 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("button", { name: "Chapter 2" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Genesis" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("shows an error affordance when the pages fail to load", async () => {
    failDocumentRequests();
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: createTestQueryClient(),
    });

    expect(
      await screen.findByRole("button", { name: "Couldn't load pages" }),
    ).toBeInTheDocument();
  });

  it("expands the sidebar when the error affordance is clicked", async () => {
    failDocumentRequests();
    renderWithProviders(<CollapsedOutlineRail book={BOOK} />, {
      client: createTestQueryClient(),
    });

    await userEvent.click(
      await screen.findByRole("button", { name: "Couldn't load pages" }),
    );

    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});
