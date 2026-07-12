import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { Popover, PopoverContent, PopoverTrigger } from "./popover";

describe("PopoverContent", () => {
  it("applies the shared popover chrome when open", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Panel content</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    const content = await screen.findByText("Panel content");
    expect(content).toHaveClass("shadow-popover");
    expect(content).toHaveClass("bg-elevated");
    expect(content).toHaveClass("rounded-lg");
    expect(content).toHaveClass("border-border");
  });

  it("merges a custom className with the default chrome", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="w-[12rem]">Panel content</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "Open" }));

    const content = await screen.findByText("Panel content");
    expect(content).toHaveClass("shadow-popover");
    expect(content).toHaveClass("w-[12rem]");
  });
});
