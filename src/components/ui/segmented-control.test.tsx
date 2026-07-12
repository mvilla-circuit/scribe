import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Grid3X3, List } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";
import { TooltipProvider } from "./tooltip";

const ICON_SEGMENTS = [
  { value: "grid", label: "Grid view", icon: Grid3X3 },
  { value: "list", label: "List view", icon: List },
] as const;

const LABEL_SEGMENTS = [
  { value: "modal", label: "Modal" },
  { value: "split", label: "Split" },
] as const;

function renderControl(props: {
  segments: typeof ICON_SEGMENTS | typeof LABEL_SEGMENTS;
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
}) {
  return render(
    <TooltipProvider>
      <SegmentedControl {...props} />
    </TooltipProvider>,
  );
}

describe("SegmentedControl", () => {
  it("exposes a group with the provided accessible label", () => {
    renderControl({
      segments: ICON_SEGMENTS,
      value: "grid",
      onChange: vi.fn(),
      "aria-label": "Layout",
    });

    expect(screen.getByRole("group", { name: "Layout" })).toBeInTheDocument();
  });

  it("marks the segment matching value as pressed and others as unpressed", () => {
    renderControl({
      segments: ICON_SEGMENTS,
      value: "grid",
      onChange: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onChange with the segment's value when clicked", async () => {
    const onChange = vi.fn();
    renderControl({ segments: ICON_SEGMENTS, value: "grid", onChange });

    await userEvent.click(screen.getByRole("button", { name: "List view" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith("list");
  });

  it("updates aria-pressed when the value prop changes", () => {
    const { rerender } = renderControl({
      segments: ICON_SEGMENTS,
      value: "grid",
      onChange: vi.fn(),
    });

    rerender(
      <TooltipProvider>
        <SegmentedControl
          segments={ICON_SEGMENTS}
          value="list"
          onChange={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByRole("button", { name: "Grid view" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows a tooltip with the segment's label on an icon-only segment", async () => {
    renderControl({
      segments: ICON_SEGMENTS,
      value: "grid",
      onChange: vi.fn(),
    });

    await userEvent.hover(screen.getByRole("button", { name: "List view" }));

    expect(await screen.findAllByText("List view")).not.toHaveLength(0);
  });

  it("renders visible text for label segments without needing a tooltip label", () => {
    renderControl({
      segments: LABEL_SEGMENTS,
      value: "modal",
      onChange: vi.fn(),
    });

    expect(screen.getByRole("button", { name: "Modal" })).toHaveTextContent(
      "Modal",
    );
  });
});
