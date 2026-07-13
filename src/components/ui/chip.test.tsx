import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Chip, RemovableChip, StaticChip } from "./chip";

describe("Chip", () => {
  it("renders as a button with a swatch wash for its color", () => {
    render(<Chip name="Fantasy" color="sky" />);

    const chip = screen.getByRole("button", { name: "Fantasy" });
    expect(chip).toHaveStyle({ color: "var(--swatch-sky)" });
  });

  it("falls back to the stone hue for an unknown color", () => {
    render(<Chip name="Untagged" color={null} />);

    expect(screen.getByRole("button", { name: "Untagged" })).toHaveStyle({
      color: "var(--swatch-stone)",
    });
  });

  it("forwards button props like onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Chip name="Fantasy" color="sky" onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Fantasy" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("StaticChip", () => {
  it("renders as non-interactive text with a swatch wash", () => {
    render(<StaticChip name="Fantasy" color="sky" />);

    const chip = screen.getByText("Fantasy");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveStyle({ color: "var(--swatch-sky)" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back to the stone hue for an unknown color", () => {
    render(<StaticChip name="Untagged" color={null} />);

    expect(screen.getByText("Untagged")).toHaveStyle({
      color: "var(--swatch-stone)",
    });
  });
});

describe("RemovableChip", () => {
  it("renders the label with a swatch wash", () => {
    render(<RemovableChip name="Fantasy" color="sky" onRemove={vi.fn()} />);

    expect(screen.getByText("Fantasy")).toHaveStyle({
      color: "var(--swatch-sky)",
    });
  });

  it("calls onRemove when the remove button is pressed", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<RemovableChip name="Fantasy" color="sky" onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: "Remove Fantasy" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("renders children instead of the plain name label", () => {
    render(
      <RemovableChip name="Fantasy" color="sky" onRemove={vi.fn()}>
        <span data-testid="custom-body">custom</span>
      </RemovableChip>,
    );

    expect(screen.getByTestId("custom-body")).toBeInTheDocument();
    expect(screen.queryByText("Fantasy")).not.toBeInTheDocument();
  });

  it("collapses remove control width at rest when removeReveal is hover", () => {
    render(
      <RemovableChip
        name="Fantasy"
        color="sky"
        onRemove={vi.fn()}
        removeReveal="hover"
      />,
    );

    const removeButton = screen.getByRole("button", { name: "Remove Fantasy" });
    // eslint-disable-next-line testing-library/no-node-access -- shell is a non-interactive span without a queryable role
    const shell = screen.getByText("Fantasy").parentElement;

    expect(shell).not.toHaveClass("gap-1");
    expect(shell).not.toHaveClass("pr-0");
    expect(shell).toHaveClass("px-2");
    expect(removeButton).toHaveClass("max-w-0");
    expect(removeButton).toHaveClass("overflow-hidden");
    expect(removeButton).toHaveClass("opacity-0");
  });

  it("reveals remove control on chip hover, focus-within, and remove focus-visible", () => {
    render(
      <RemovableChip
        name="Fantasy"
        color="sky"
        onRemove={vi.fn()}
        removeReveal="hover"
      />,
    );

    const removeButton = screen.getByRole("button", { name: "Remove Fantasy" });

    expect(removeButton.className).toMatch(/group-hover\/chip:max-w-/);
    expect(removeButton.className).toMatch(/group-hover\/chip:opacity-100/);
    expect(removeButton.className).toMatch(/group-focus-within\/chip:max-w-/);
    expect(removeButton.className).toMatch(
      /group-focus-within\/chip:opacity-100/,
    );
    expect(removeButton.className).toMatch(/focus-visible:max-w-/);
    expect(removeButton.className).toMatch(/focus-visible:opacity-100/);
  });

  it("always mode keeps full-size remove chrome", () => {
    render(<RemovableChip name="Fantasy" color="sky" onRemove={vi.fn()} />);

    const removeButton = screen.getByRole("button", { name: "Remove Fantasy" });
    // eslint-disable-next-line testing-library/no-node-access -- shell is a non-interactive span without a queryable role
    const shell = screen.getByText("Fantasy").parentElement;

    expect(shell).toHaveClass("gap-1");
    expect(shell).toHaveClass("pr-1");
    expect(removeButton).toHaveClass("size-3.5");
    expect(removeButton).not.toHaveClass("max-w-0");
    expect(removeButton).not.toHaveClass("opacity-0");
  });

  it("gates remove reveal transitions behind motion-reduce", () => {
    render(
      <RemovableChip
        name="Fantasy"
        color="sky"
        onRemove={vi.fn()}
        removeReveal="hover"
      />,
    );

    const removeButton = screen.getByRole("button", { name: "Remove Fantasy" });

    expect(removeButton.className).toMatch(/duration-150/);
    expect(removeButton.className).toMatch(/ease-out/);
    expect(removeButton).toHaveClass("motion-reduce:transition-none");
  });
});

describe("Chip washed toggle", () => {
  it("skips the swatch wash when washed is false", () => {
    render(<Chip name="Draft" color="sky" washed={false} />);

    const chip = screen.getByRole("button", { name: "Draft" });
    expect(chip).toHaveClass("bg-tree-group");
    expect(chip).not.toHaveStyle({ color: "var(--swatch-sky)" });
  });
});
