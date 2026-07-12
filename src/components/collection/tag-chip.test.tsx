import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TagChip } from "./tag-chip";

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
