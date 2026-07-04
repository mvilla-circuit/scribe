import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import {
  type SpellTarget,
  useSpellPopover,
} from "./extensions/spellcheck-store";
import { SpellPopover } from "./spell-popover";

function openTarget(overrides: Partial<SpellTarget> = {}): SpellTarget {
  const target: SpellTarget = {
    word: "helllo",
    suggestions: ["hello", "hollo"],
    anchorRect: null,
    replace: vi.fn(),
    ignore: vi.fn(),
    addToDictionary: vi.fn(),
    ...overrides,
  };
  useSpellPopover.getState().open(target);
  return target;
}

afterEach(() => {
  useSpellPopover.getState().close();
});

describe("SpellPopover", () => {
  it("renders the suggestions plus the Ignore and Add-to-dictionary actions", () => {
    openTarget();
    renderWithProviders(<SpellPopover />);

    expect(screen.getByRole("button", { name: "hello" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "hollo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ignore" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add to dictionary" }),
    ).toBeInTheDocument();
  });

  it("replaces the misspelled word when a suggestion is chosen", () => {
    const target = openTarget();
    renderWithProviders(<SpellPopover />);

    fireEvent.click(screen.getByRole("button", { name: "hello" }));
    expect(target.replace).toHaveBeenCalledWith("hello");
  });

  it("ignores the word for the document", () => {
    const target = openTarget();
    renderWithProviders(<SpellPopover />);

    fireEvent.click(screen.getByRole("button", { name: "Ignore" }));
    expect(target.ignore).toHaveBeenCalledTimes(1);
  });

  it("adds the word to the account-wide dictionary", () => {
    const target = openTarget();
    renderWithProviders(<SpellPopover />);

    fireEvent.click(screen.getByRole("button", { name: "Add to dictionary" }));
    expect(target.addToDictionary).toHaveBeenCalledTimes(1);
  });

  it("shows a note when there are no suggestions", () => {
    openTarget({ suggestions: [] });
    renderWithProviders(<SpellPopover />);

    expect(screen.getByText("No suggestions")).toBeInTheDocument();
  });

  it("clears the active target on unmount so it can't reopen on the next page", () => {
    openTarget();
    const { unmount } = renderWithProviders(<SpellPopover />);
    expect(useSpellPopover.getState().target).not.toBeNull();

    // Unmounting mirrors the editor being torn down on a page change; the stale
    // target (bound to the old view) must not survive to the next editor's popover.
    unmount();
    expect(useSpellPopover.getState().target).toBeNull();
  });
});
