import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StaticTagChip, TagChip } from "./tag-chip";

describe("TagChip", () => {
  it("renders the tag name with a swatch wash for its color", () => {
    render(<TagChip name="Fantasy" color="sky" />);

    const chip = screen.getByRole("button", { name: "Fantasy" });
    expect(chip).toHaveStyle({ color: "var(--swatch-sky)" });
  });

  it("falls back to the stone hue for an unknown color", () => {
    render(<TagChip name="Untagged" color={null} />);

    expect(screen.getByRole("button", { name: "Untagged" })).toHaveStyle({
      color: "var(--swatch-stone)",
    });
  });

  it("fires onClick when pressed", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<TagChip name="Fantasy" color="sky" onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Fantasy" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("StaticTagChip", () => {
  it("renders the tag name as non-interactive text with a swatch wash", () => {
    render(<StaticTagChip name="Fantasy" color="sky" />);

    const chip = screen.getByText("Fantasy");
    expect(chip.tagName).toBe("SPAN");
    expect(chip).toHaveStyle({ color: "var(--swatch-sky)" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("falls back to the stone hue for an unknown color", () => {
    render(<StaticTagChip name="Untagged" color={null} />);

    expect(screen.getByText("Untagged")).toHaveStyle({
      color: "var(--swatch-stone)",
    });
  });
});
