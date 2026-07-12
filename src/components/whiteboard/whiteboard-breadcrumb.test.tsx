import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import {
  booksKey,
  collectionsKey,
  documentsKey,
  whiteboardsKey,
} from "@/data/query-keys";
import { useUIStore } from "@/store/ui";
import {
  makeBook,
  makeCollection,
  makeDocument,
  makeWhiteboard,
} from "@/test/fixtures";
import {
  createTestQueryClient,
  renderWithProviders,
} from "@/test/render-with-query";

import { WhiteboardBreadcrumb } from "./whiteboard-breadcrumb";

beforeEach(() => {
  useUIStore.setState({
    activeBookId: null,
    activeDocId: null,
    activeCollectionId: null,
    activeWhiteboardId: null,
  });
});

describe("WhiteboardBreadcrumb", () => {
  it("shows the book and navigates to the title page when clicked", async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(booksKey, [makeBook({ id: "b1", title: "Genesis" })]);
    client.setQueryData(documentsKey("b1"), []);
    useUIStore.setState({
      activeBookId: "b1",
      activeWhiteboardId: "wb1",
    });

    renderWithProviders(
      <WhiteboardBreadcrumb
        whiteboard={makeWhiteboard({
          id: "wb1",
          book_id: "b1",
          collection_id: null,
          name: "Something",
        })}
        current={<span>Something</span>}
      />,
      { client },
    );

    expect(screen.getByLabelText("Breadcrumb")).toHaveTextContent("Genesis");

    await user.click(screen.getByRole("button", { name: "Genesis" }));

    const state = useUIStore.getState();
    expect(state.activeBookId).toBe("b1");
    expect(state.activeDocId).toBeNull();
    expect(state.activeWhiteboardId).toBeNull();
  });

  it("includes parent pages for a nested book whiteboard", async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(booksKey, [makeBook({ id: "b1", title: "Genesis" })]);
    client.setQueryData(documentsKey("b1"), [
      makeDocument({ id: "parent", book_id: "b1", title: "Chapter" }),
    ]);
    useUIStore.setState({
      activeBookId: "b1",
      activeWhiteboardId: "wb1",
    });

    renderWithProviders(
      <WhiteboardBreadcrumb
        whiteboard={makeWhiteboard({
          id: "wb1",
          book_id: "b1",
          collection_id: null,
          parent_document_id: "parent",
          name: "Diagram",
        })}
        current={<span>Diagram</span>}
      />,
      { client },
    );

    expect(screen.getByLabelText("Breadcrumb")).toHaveTextContent(
      "Genesis/Chapter/Diagram",
    );

    await user.click(screen.getByRole("button", { name: "Chapter" }));

    const state = useUIStore.getState();
    expect(state.activeDocId).toBe("parent");
    expect(state.activeWhiteboardId).toBeNull();
  });

  it("shows the collection for a collection-owned whiteboard", async () => {
    const user = userEvent.setup();
    const client = createTestQueryClient();
    client.setQueryData(collectionsKey, [
      makeCollection({ id: "c1", name: "Research" }),
    ]);
    client.setQueryData(whiteboardsKey, []);
    useUIStore.setState({
      activeWhiteboardId: "wb1",
    });

    renderWithProviders(
      <WhiteboardBreadcrumb
        whiteboard={makeWhiteboard({
          id: "wb1",
          collection_id: "c1",
          book_id: null,
          name: "Map",
        })}
        current={<span>Map</span>}
      />,
      { client },
    );

    expect(screen.getByLabelText("Breadcrumb")).toHaveTextContent("Research");

    await user.click(screen.getByRole("button", { name: "Research" }));

    const state = useUIStore.getState();
    expect(state.activeCollectionId).toBe("c1");
    expect(state.activeWhiteboardId).toBeNull();
  });
});
