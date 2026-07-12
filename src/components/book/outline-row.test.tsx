import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { makeDocument, makeWhiteboard } from "@/test/fixtures";

import { type FlatBookOutlineNode } from "./outline-dnd";
import { OutlineRow } from "./outline-row";

type FlatDocumentOutlineNode = Extract<
  FlatBookOutlineNode,
  { kind: "document" }
>;

function makeNode(
  overrides: Partial<FlatDocumentOutlineNode> & { hasChildren: boolean },
): FlatDocumentOutlineNode {
  const document = makeDocument({
    id: "d1",
    title: "Chapter 1",
    ...overrides.document,
  });
  return {
    id: document.id,
    kind: "document",
    depth: 0,
    parentId: null,
    position: document.position,
    document,
    ...overrides,
  };
}

function RowHarness({
  children,
  itemId,
}: {
  children: ReactNode;
  itemId: string;
}) {
  return (
    <TooltipProvider>
      <DndContext>
        <SortableContext
          items={[itemId]}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </DndContext>
    </TooltipProvider>
  );
}

function renderRow(
  node: FlatBookOutlineNode,
  options: {
    expanded?: boolean;
    onToggleExpand?: (id: string) => void;
    onSelect?: (id: string) => void;
  } = {},
) {
  const onToggleExpand = options.onToggleExpand ?? vi.fn();
  const onSelect = options.onSelect ?? vi.fn();
  const unused = vi.fn();

  const view = render(
    <RowHarness itemId={node.id}>
      <OutlineRow
        node={node}
        selected={false}
        editing={false}
        expanded={options.expanded ?? false}
        projectionDepth={null}
        onToggleExpand={onToggleExpand}
        onSelectDocument={onSelect}
        onSelectWhiteboard={unused}
        onStartRename={unused}
        onCommitRename={unused}
        onCancelRename={unused}
        onDelete={unused}
        onDuplicate={unused}
        onCopyLink={unused}
        onNewChild={unused}
        onNewWhiteboardChild={unused}
      />
    </RowHarness>,
  );

  return { onToggleExpand, onSelect, container: view.container };
}

describe("OutlineRow expand toggle", () => {
  it("shows an Expand button when the node has children", () => {
    renderRow(makeNode({ hasChildren: true }));

    expect(screen.getByRole("button", { name: "Expand" })).toBeInTheDocument();
  });

  it("calls onToggleExpand and not onSelect when Expand is clicked", async () => {
    const user = userEvent.setup();
    const { onToggleExpand, onSelect } = renderRow(
      makeNode({ hasChildren: true }),
    );

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(onToggleExpand).toHaveBeenCalledExactlyOnceWith("d1");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("does not show an Expand button when the node has no children", () => {
    renderRow(makeNode({ hasChildren: false }));

    expect(
      screen.queryByRole("button", { name: "Expand" }),
    ).not.toBeInTheDocument();
  });

  it("shows Collapse and rotates the chevron when expanded", () => {
    const { container } = renderRow(makeNode({ hasChildren: true }), {
      expanded: true,
    });

    expect(
      screen.getByRole("button", { name: "Collapse" }),
    ).toBeInTheDocument();
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative chevron svg has no accessible role
    expect(container.querySelector(".rotate-90")).toBeInTheDocument();
  });
});

describe("OutlineRow whiteboard", () => {
  it("renders a leaf whiteboard without add-inside actions", async () => {
    const user = userEvent.setup();
    const whiteboard = makeWhiteboard({
      id: "w1",
      collection_id: null,
      book_id: "book-1",
      name: "Map",
    });
    const node: FlatBookOutlineNode = {
      id: whiteboard.id,
      kind: "whiteboard",
      depth: 0,
      parentId: null,
      position: whiteboard.position,
      hasChildren: false,
      whiteboard,
    };

    renderRow(node);
    await user.click(screen.getByRole("button", { name: "More actions" }));

    expect(
      screen.queryByRole("menuitem", { name: "Add page inside" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Add whiteboard inside" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "Rename" }),
    ).toBeInTheDocument();
  });
});
