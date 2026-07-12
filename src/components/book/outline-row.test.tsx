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
import { makeDocument } from "@/test/fixtures";

import { type FlatDocNode } from "./outline-dnd";
import { OutlineRow } from "./outline-row";

function makeNode(
  overrides: Partial<FlatDocNode> & { hasChildren: boolean },
): FlatDocNode {
  const document = makeDocument({
    id: "d1",
    title: "Chapter 1",
    ...overrides.document,
  });
  return {
    id: document.id,
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
  node: FlatDocNode,
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
        onSelect={onSelect}
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
