import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SubtitleToggle } from "./subtitle-toggle";
import { TooltipProvider } from "./tooltip";

function renderToggle(props: { active: boolean; onToggle: () => void }) {
  return render(
    <TooltipProvider>
      <SubtitleToggle {...props} />
    </TooltipProvider>,
  );
}

describe("SubtitleToggle", () => {
  it("exposes a 'Show subtitle' control that is not pressed when inactive", () => {
    renderToggle({ active: false, onToggle: vi.fn() });
    const button = screen.getByRole("button", { name: "Show subtitle" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects the active state in its label and pressed attribute", () => {
    renderToggle({ active: true, onToggle: vi.fn() });
    const button = screen.getByRole("button", { name: "Hide subtitle" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("invokes onToggle when clicked", async () => {
    const onToggle = vi.fn();
    renderToggle({ active: false, onToggle });

    await userEvent.click(
      screen.getByRole("button", { name: "Show subtitle" }),
    );

    expect(onToggle).toHaveBeenCalledOnce();
  });
});
