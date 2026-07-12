import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { MORANDI_SWATCHES, titleCaseHue } from "@/lib/swatches";

import { MorandiSwatchGrid } from "./morandi-swatch-grid";

function renderGrid(
  props: Partial<ComponentProps<typeof MorandiSwatchGrid>> = {},
) {
  const onChange = props.onChange ?? vi.fn();
  render(
    <TooltipProvider>
      <MorandiSwatchGrid
        value={props.value ?? null}
        onChange={onChange}
        ariaLabelForHue={props.ariaLabelForHue ?? ((hue) => hue)}
      />
    </TooltipProvider>,
  );
  return { onChange };
}

describe("MorandiSwatchGrid", () => {
  it("renders one button per Morandi hue in Title Case", () => {
    renderGrid();

    expect(screen.getAllByRole("button")).toHaveLength(MORANDI_SWATCHES.length);
    for (const hue of MORANDI_SWATCHES) {
      expect(
        screen.getByRole("button", { name: titleCaseHue(hue) }),
      ).toBeInTheDocument();
    }
  });

  it("marks the active hue pressed", () => {
    renderGrid({ value: "sky" });

    expect(screen.getByRole("button", { name: "Sky" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    for (const hue of MORANDI_SWATCHES) {
      if (hue === "sky") continue;
      expect(
        screen.getByRole("button", { name: titleCaseHue(hue) }),
      ).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("reports the picked hue key (lowercase)", async () => {
    const { onChange } = renderGrid({ value: null });

    await userEvent.click(screen.getByRole("button", { name: "Fern" }));
    expect(onChange).toHaveBeenCalledWith("fern");
  });

  it("does not render a clear chip", () => {
    renderGrid({ value: null });

    expect(screen.getAllByRole("button")).toHaveLength(MORANDI_SWATCHES.length);
  });

  it("keeps the tooltip label as the Title Case hue when aria names are richer", () => {
    renderGrid({
      value: "umber",
      ariaLabelForHue: (hue) => `${hue} for Historical`,
    });

    const swatch = screen.getByRole("button", {
      name: "Umber for Historical",
    });
    expect(swatch).toHaveAttribute("aria-label", "Umber for Historical");
  });
});
