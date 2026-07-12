import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { CollectionTags } from "./collection-tags";

// Radix dropdowns probe pointer-capture / scroll focused items into view;
// jsdom implements neither, so polyfill them for the color/remove menu to
// open (matches the pattern in row-action-menu.test.tsx).
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CollectionTags", () => {
  it("renders assigned tag chips", () => {
    renderWithProviders(
      <CollectionTags
        tags={[
          { id: "t1", name: "Fantasy", color: "sky" },
          { id: "t2", name: "Draft", color: "honey" },
        ]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Fantasy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draft" })).toBeInTheDocument();
  });

  it("shows Add tag when none assigned", () => {
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument();
  });

  it("adds a tag via the editor", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.type(screen.getByLabelText("New tag name"), "Worldbuilding");
    await user.keyboard("{Enter}");

    expect(onAdd).toHaveBeenCalledWith("Worldbuilding");
    expect(screen.queryByLabelText("New tag name")).not.toBeInTheDocument();
  });

  it("assigns from a suggested library tag", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        suggestions={[{ id: "lib-1", name: "Reference", color: "moss" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.click(screen.getByRole("option", { name: "Reference" }));

    expect(onAdd).toHaveBeenCalledWith("Reference");
  });

  it("recolors from the chip popover", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRecolor = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={onRecolor}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(
      await screen.findByRole("button", { name: "moss for Fantasy" }),
    );

    expect(onRecolor).toHaveBeenCalledWith("t1", "moss");
  });

  it("removes from the collection", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRemove = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={onRemove}
        onRecolor={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(await screen.findByRole("menuitem", { name: "Remove" }));

    expect(onRemove).toHaveBeenCalledWith("t1");
  });
});
