import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import type { Swatch } from "./palette";
import { SwatchSection } from "./swatch-grid";

const SWATCHES: Swatch[] = [
  { name: "Red", value: "#ff0000" },
  { name: "Blue", value: "#0000ff" },
];

function renderSection(
  props: Partial<React.ComponentProps<typeof SwatchSection>> = {},
) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <TooltipProvider>
      <SwatchSection
        label="Text"
        swatches={SWATCHES}
        value={null}
        onChange={onChange}
        clearLabel="Default color"
        {...props}
      />
    </TooltipProvider>,
  );
  return { onChange };
}

describe("SwatchSection", () => {
  it("renders the section label and one chip per swatch plus a clear chip", () => {
    renderSection();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Default color" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blue" })).toBeInTheDocument();
  });

  it("marks the clear chip pressed when no value is set", () => {
    renderSection({ value: null });
    expect(
      screen.getByRole("button", { name: "Default color" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("marks the matching swatch pressed when a value is set", () => {
    renderSection({ value: "#0000ff" });
    expect(screen.getByRole("button", { name: "Blue" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Default color" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the picked swatch value", async () => {
    const { onChange } = renderSection();
    await userEvent.click(screen.getByRole("button", { name: "Red" }));
    expect(onChange).toHaveBeenCalledWith("#ff0000");
  });

  it("reports null when the clear chip is picked", async () => {
    const { onChange } = renderSection({ value: "#ff0000" });
    await userEvent.click(
      screen.getByRole("button", { name: "Default color" }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
