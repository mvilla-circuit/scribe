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
});
