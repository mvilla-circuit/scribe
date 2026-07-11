import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { type RowAction, RowActionDropdown } from "./row-action-menu";

// Radix dropdowns probe pointer-capture / scroll focused items into view;
// jsdom implements neither, so polyfill them for the actions menu to open.
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("RowActionDropdown submenu", () => {
  it("opens a nested submenu and fires the nested action's onSelect", async () => {
    const user = userEvent.setup();
    const onSelectNested = vi.fn();
    const onSelectParent = vi.fn();

    const actions: RowAction[] = [
      {
        icon: <span aria-hidden>x</span>,
        label: "Move to collection",
        onSelect: onSelectParent,
        submenu: [
          {
            icon: <span aria-hidden>a</span>,
            label: "Reading list",
            onSelect: onSelectNested,
          },
        ],
      },
    ];

    renderWithProviders(<RowActionDropdown actions={actions} />);

    screen.getByRole("button", { name: "More actions" }).focus();
    // Open the dropdown from the keyboard so focus lands on the first item.
    await user.keyboard("{Enter}");

    const trigger = await screen.findByRole("menuitem", {
      name: "Move to collection",
    });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");

    // Right-arrow opens the submenu and moves focus into its first item.
    await user.keyboard("{ArrowRight}");

    const nested = await screen.findByRole("menuitem", {
      name: "Reading list",
    });
    expect(nested).toBeInTheDocument();

    await user.keyboard("{Enter}");

    expect(onSelectNested).toHaveBeenCalledOnce();
    expect(onSelectParent).not.toHaveBeenCalled();
  });
});
