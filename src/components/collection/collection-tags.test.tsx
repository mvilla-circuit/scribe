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
        onRename={vi.fn()}
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
        onRename={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Add tag" })).toBeInTheDocument();
  });

  it("opens a dropdown with name field and color palette when adding", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));

    expect(screen.getByLabelText("New tag name")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Tag color" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stone" })).toHaveClass(
      "h-6",
      "w-6",
    );
    expect(screen.getByRole("menu")).toContainElement(
      screen.getByLabelText("New tag name"),
    );
  });

  it("adds a tag with the selected color via the dropdown", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onAdd = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.click(screen.getByRole("button", { name: "Moss" }));
    await user.type(screen.getByLabelText("New tag name"), "Worldbuilding");
    await user.keyboard("{Enter}");

    expect(onAdd).toHaveBeenCalledWith("Worldbuilding", "moss");
  });

  it("assigns from a suggested library tag", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onAdd = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
        suggestions={[{ id: "lib-1", name: "Reference", color: "moss" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.click(screen.getByRole("menuitem", { name: "Reference" }));

    expect(onAdd).toHaveBeenCalledWith("Reference", "moss");
  });

  it("selects a filtered library tag while typing a partial name", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onAdd = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={onAdd}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
        suggestions={[
          { id: "lib-1", name: "Thriller", color: "umber" },
          { id: "lib-2", name: "Fantasy", color: "sky" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.type(screen.getByLabelText("New tag name"), "thri");
    await user.click(screen.getByRole("menuitem", { name: "Thriller" }));

    expect(onAdd).toHaveBeenCalledWith("Thriller", "umber");
    expect(onAdd).not.toHaveBeenCalledWith("thri", expect.anything());
  });

  it("deletes a library tag from the suggestions list", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onDeleteSuggestion = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
        onDeleteSuggestion={onDeleteSuggestion}
        suggestions={[{ id: "lib-1", name: "Historical", color: "honey" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add tag" }));
    await user.click(screen.getByRole("button", { name: "Delete Historical" }));

    expect(onDeleteSuggestion).toHaveBeenCalledWith("lib-1");
  });

  it("opens the same editor dropdown when clicking an existing tag", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));

    expect(screen.getByLabelText("Tag name")).toHaveValue("Fantasy");
    expect(
      screen.getByRole("group", { name: "Color for Fantasy" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("menuitem", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("renames from the chip dropdown", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRename = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={onRename}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    const input = screen.getByLabelText("Tag name");
    await user.clear(input);
    await user.type(input, "Epic");
    await user.keyboard("{Enter}");

    expect(onRename).toHaveBeenCalledWith("t1", "Epic");
  });

  it("cancels a rename left blank instead of committing an empty name", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRename = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={onRename}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    const input = screen.getByLabelText("Tag name");
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onRename).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("group", { name: "Color for Fantasy" }),
    ).not.toBeInTheDocument();
  });

  it("does not commit a rename left unchanged", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRename = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={onRename}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.keyboard("{Enter}");

    expect(onRename).not.toHaveBeenCalled();
  });

  it("recolors from the chip dropdown", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRecolor = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={onRecolor}
        onRename={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(
      await screen.findByRole("button", { name: "Moss for Fantasy" }),
    );

    expect(onRecolor).toHaveBeenCalledWith("t1", "moss");
  });

  it("hides Add tag at rest when tags are assigned", () => {
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    const addButton = screen.getByRole("button", { name: "Add tag" });

    expect(addButton).toHaveClass("opacity-0");
    expect(addButton).not.toHaveClass("max-w-0");
    expect(addButton.className).not.toMatch(/transition-/);
  });

  it("Add tag reveal classes include masthead hover focus-within and open", () => {
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    const addButton = screen.getByRole("button", { name: "Add tag" });

    expect(addButton.className).toMatch(/group-hover\/masthead:opacity-100/);
    expect(addButton.className).toMatch(
      /group-focus-within\/masthead:opacity-100/,
    );
    expect(addButton.className).toMatch(/focus-visible:opacity-100/);
    expect(addButton.className).toMatch(/data-\[state=open\]:opacity-100/);
    expect(addButton.className).not.toMatch(/duration-150/);
    expect(addButton.className).not.toMatch(/group-hover\/masthead:max-w-/);
  });

  it("removes via the hover X on the chip", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onRemove = vi.fn();
    renderWithProviders(
      <CollectionTags
        tags={[{ id: "t1", name: "Fantasy", color: "sky" }]}
        onAdd={vi.fn()}
        onRemove={onRemove}
        onRecolor={vi.fn()}
        onRename={vi.fn()}
      />,
    );

    await user.hover(screen.getByRole("button", { name: "Fantasy" }));
    await user.click(screen.getByRole("button", { name: "Remove Fantasy" }));

    expect(onRemove).toHaveBeenCalledWith("t1");
  });
});
