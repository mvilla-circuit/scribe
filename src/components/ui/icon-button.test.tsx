import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("exposes the label as the accessible name", () => {
    renderWithProviders(
      <IconButton label="Settings" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(
      screen.getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("applies selected styles when selected", () => {
    renderWithProviders(
      <IconButton label="Settings" selected onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveClass(
      "bg-selected",
    );
  });

  it("omits selected styles by default", () => {
    renderWithProviders(
      <IconButton label="Settings" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).not.toHaveClass(
      "bg-selected",
    );
  });

  it("shows the label as tooltip content on hover", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <IconButton label="Settings" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    await user.hover(screen.getByRole("button", { name: "Settings" }));

    expect(await screen.findByRole("tooltip")).toHaveTextContent("Settings");
  });

  it("invokes onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(
      <IconButton label="Settings" onClick={onClick}>
        <span>icon</span>
      </IconButton>,
    );

    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to a button type so it never submits an ancestor form", () => {
    renderWithProviders(
      <IconButton label="Settings" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("applies the sm size classes", () => {
    renderWithProviders(
      <IconButton label="Settings" size="sm" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveClass(
      "h-7",
      "w-7",
    );
  });

  it("defaults to the md size classes", () => {
    renderWithProviders(
      <IconButton label="Settings" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveClass(
      "h-9",
      "w-9",
    );
  });

  it("merges a caller-provided className", () => {
    renderWithProviders(
      <IconButton label="Settings" className="mx-auto" onClick={vi.fn()}>
        <span>icon</span>
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toHaveClass(
      "mx-auto",
    );
  });
});
