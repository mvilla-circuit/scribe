import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DashedAddTile } from "./dashed-add-tile";

describe("DashedAddTile", () => {
  it("renders its label", () => {
    render(<DashedAddTile onClick={vi.fn()}>New row</DashedAddTile>);

    expect(screen.getByRole("button", { name: "New row" })).toBeInTheDocument();
  });

  it("invokes onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<DashedAddTile onClick={onClick}>New row</DashedAddTile>);

    await userEvent.click(screen.getByRole("button", { name: "New row" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is keyboard activatable", async () => {
    const onClick = vi.fn();
    render(<DashedAddTile onClick={onClick}>New row</DashedAddTile>);

    const button = screen.getByRole("button", { name: "New row" });
    button.focus();
    await userEvent.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledOnce();
  });
});
