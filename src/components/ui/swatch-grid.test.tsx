import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";

import { SwatchDot, SwatchGrid, SwatchGridLayout } from "./swatch-grid";

describe("SwatchDot", () => {
  it("renders inactive and active Accent chrome", () => {
    const { rerender } = render(
      <TooltipProvider>
        <SwatchDot
          label="Sky"
          background="var(--swatch-sky)"
          active={false}
          onClick={vi.fn()}
        />
      </TooltipProvider>,
    );

    const inactive = screen.getByRole("button", { name: "Sky" });
    expect(inactive).toHaveClass("h-6", "w-6", "rounded-full");
    expect(inactive).toHaveAttribute("aria-pressed", "false");
    expect(inactive.className).not.toMatch(/ring-offset-2/);

    rerender(
      <TooltipProvider>
        <SwatchDot
          label="Sky"
          background="var(--swatch-sky)"
          active
          onClick={vi.fn()}
        />
      </TooltipProvider>,
    );

    const active = screen.getByRole("button", { name: "Sky" });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active.className).toMatch(/ring-2/);
    expect(active.className).toMatch(/ring-offset-2/);
    expect(active.className).toMatch(/ring-offset-elevated/);
  });
});

describe("SwatchGridLayout", () => {
  it("lays out children in the shared 5-col grid", () => {
    render(
      <SwatchGridLayout>
        <span>a</span>
      </SwatchGridLayout>,
    );

    expect(screen.getByTestId("swatch-grid")).toHaveClass(
      "grid",
      "grid-cols-5",
      "place-items-center",
      "gap-y-2.5",
    );
  });
});

describe("SwatchGrid", () => {
  const SWATCHES = [
    { name: "Red", value: "#ff0000" },
    { name: "Blue", value: "#0000ff" },
  ];

  it("omits clear chip when not configured", () => {
    render(
      <TooltipProvider>
        <SwatchGrid swatches={SWATCHES} value="#ff0000" onChange={vi.fn()} />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Red" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("reports null when clear is picked", async () => {
    const onChange = vi.fn();
    render(
      <TooltipProvider>
        <SwatchGrid
          swatches={SWATCHES}
          value="#ff0000"
          onChange={onChange}
          clearLabel="Default color"
        />
      </TooltipProvider>,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Default color" }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("reports the picked swatch value", async () => {
    const onChange = vi.fn();
    render(
      <TooltipProvider>
        <SwatchGrid
          swatches={SWATCHES}
          value={null}
          onChange={onChange}
          clearLabel="Default color"
        />
      </TooltipProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Red" }));
    expect(onChange).toHaveBeenCalledWith("#ff0000");
  });
});
