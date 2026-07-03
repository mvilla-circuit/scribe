import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUIStore } from "@/store/ui";
import { makeDocument } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { TableOfContents } from "./table-of-contents";

// A parent page ("ch1") with a nested subtree, plus an unrelated sibling
// ("ch2") that must never leak into the scoped contents.
const DOCS = [
  makeDocument({ id: "title", is_title_page: true }),
  makeDocument({ id: "ch1", title: "Chapter 1", position: 1024 }),
  makeDocument({
    id: "ch1a",
    title: "Section 1a",
    parent_document_id: "ch1",
    position: 1024,
  }),
  makeDocument({
    id: "ch1a1",
    title: "Sub 1a1",
    parent_document_id: "ch1a",
    position: 1024,
  }),
  makeDocument({ id: "ch2", title: "Chapter 2", position: 2048 }),
];

beforeEach(() => {
  useUIStore.getState().setActiveDoc(null);
});

describe("TableOfContents", () => {
  it("renders the subtree for a rootId", () => {
    renderWithProviders(
      <TableOfContents
        documents={DOCS}
        loading={false}
        titleFont="var(--font-display)"
        rootId="ch1"
        expandedIds={new Set(["ch1a"])}
        onToggle={vi.fn()}
      />,
    );

    // ch1's descendants show (ch1a, and its expanded child ch1a1)...
    expect(screen.getByText("Section 1a")).toBeInTheDocument();
    expect(screen.getByText("Sub 1a1")).toBeInTheDocument();
    // ...but neither the parent itself nor the unrelated sibling appears.
    expect(screen.queryByText("Chapter 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Chapter 2")).not.toBeInTheDocument();
  });

  it("navigates on row click", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TableOfContents
        documents={DOCS}
        loading={false}
        titleFont="var(--font-display)"
        rootId="ch1"
        expandedIds={new Set()}
        onToggle={vi.fn()}
      />,
    );

    await user.click(screen.getByText("Section 1a"));

    expect(useUIStore.getState().activeDocId).toBe("ch1a");
  });
});
