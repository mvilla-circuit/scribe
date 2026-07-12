import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExpandToggleIcon } from "./expand-toggle-icon";

describe("ExpandToggleIcon", () => {
  it("renders children and no expand button when hasChildren is false", () => {
    render(
      <ExpandToggleIcon
        expanded={false}
        hasChildren={false}
        expandLabel="Expand"
        collapseLabel="Collapse"
        onToggle={vi.fn()}
      >
        <span data-testid="resting-icon">icon</span>
      </ExpandToggleIcon>,
    );

    expect(screen.getByTestId("resting-icon")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Expand" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Collapse" }),
    ).not.toBeInTheDocument();
  });

  it("renders an expand button with expandLabel when hasChildren and collapsed", () => {
    render(
      <ExpandToggleIcon
        expanded={false}
        hasChildren
        expandLabel="Expand collection"
        collapseLabel="Collapse collection"
        onToggle={vi.fn()}
      >
        <span>icon</span>
      </ExpandToggleIcon>,
    );

    expect(
      screen.getByRole("button", { name: "Expand collection" }),
    ).toBeInTheDocument();
  });

  it("uses collapseLabel when expanded", () => {
    render(
      <ExpandToggleIcon
        expanded
        hasChildren
        expandLabel="Expand collection"
        collapseLabel="Collapse collection"
        onToggle={vi.fn()}
      >
        <span>icon</span>
      </ExpandToggleIcon>,
    );

    expect(
      screen.getByRole("button", { name: "Collapse collection" }),
    ).toBeInTheDocument();
  });

  it("rotates the chevron when expanded", () => {
    const { container } = render(
      <ExpandToggleIcon
        expanded
        hasChildren
        expandLabel="Expand"
        collapseLabel="Collapse"
        onToggle={vi.fn()}
      >
        <span>icon</span>
      </ExpandToggleIcon>,
    );

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative chevron svg has no accessible role
    const rotated = container.querySelector(".rotate-90");
    expect(rotated).toBeInTheDocument();
  });

  it("applies hover/focus opacity classes on icon and button when hasChildren", () => {
    render(
      <ExpandToggleIcon
        expanded={false}
        hasChildren
        expandLabel="Expand"
        collapseLabel="Collapse"
        onToggle={vi.fn()}
      >
        <span data-testid="resting-icon">icon</span>
      </ExpandToggleIcon>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- assert fade classes on the resting-icon wrapper
    const iconWrapper = screen.getByTestId("resting-icon").parentElement;
    expect(iconWrapper).toHaveClass("group-hover:opacity-0");
    expect(iconWrapper).toHaveClass("group-focus-within:opacity-0");

    const button = screen.getByRole("button", { name: "Expand" });
    expect(button).toHaveClass("opacity-0");
    expect(button).toHaveClass("group-hover:opacity-100");
    expect(button).toHaveClass("group-focus-within:opacity-100");
  });

  it("gates opacity and transform transitions behind motion-reduce", () => {
    const { container } = render(
      <ExpandToggleIcon
        expanded={false}
        hasChildren
        expandLabel="Expand"
        collapseLabel="Collapse"
        onToggle={vi.fn()}
      >
        <span data-testid="resting-icon">icon</span>
      </ExpandToggleIcon>,
    );

    // eslint-disable-next-line testing-library/no-node-access -- assert transition classes on the resting-icon wrapper
    const iconWrapper = screen.getByTestId("resting-icon").parentElement;
    expect(iconWrapper).toHaveClass("motion-reduce:transition-none");
    expect(iconWrapper).toHaveClass("transition-opacity");

    const button = screen.getByRole("button", { name: "Expand" });
    expect(button).toHaveClass("motion-reduce:transition-none");
    expect(button).toHaveClass("transition-opacity");

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- decorative chevron svg has no accessible role
    const chevron = container.querySelector("svg");
    expect(chevron).toHaveClass("motion-reduce:transition-none");
    expect(chevron).toHaveClass("transition-transform");
  });

  it("calls onToggle when the expand button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <ExpandToggleIcon
        expanded={false}
        hasChildren
        expandLabel="Expand"
        collapseLabel="Collapse"
        onToggle={onToggle}
      >
        <span>icon</span>
      </ExpandToggleIcon>,
    );

    await user.click(screen.getByRole("button", { name: "Expand" }));

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
