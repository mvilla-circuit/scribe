import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { AddCoverButton, PageCover } from "./page-cover";

describe("PageCover", () => {
  it("renders the cover image when a URL is set", () => {
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Page cover")).toHaveAttribute(
      "src",
      "https://example.com/cover.jpg",
    );
  });

  it("renders nothing when there is no cover", () => {
    renderWithProviders(
      <PageCover coverUrl={null} onUpload={vi.fn()} onRemove={vi.fn()} />,
    );

    expect(screen.queryByRole("img", { name: "Page cover" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add cover" }),
    ).not.toBeInTheDocument();
  });

  it("disables pointer events on cover controls until hover or focus", () => {
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByTestId("page-cover-controls")).toHaveClass(
      "pointer-events-none",
      "group-hover:pointer-events-auto",
      "z-10",
    );
  });

  it("styles cover floating controls as compact inverted chrome", () => {
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    for (const name of [
      "Reposition cover",
      "View cover",
      "Change cover",
      "Remove cover",
    ]) {
      expect(screen.getByRole("button", { name })).toHaveClass("bg-inverted");
    }
    for (const name of ["Reposition cover", "View cover", "Remove cover"]) {
      expect(screen.getByRole("button", { name })).toHaveClass("size-7");
    }
  });

  it("keeps Save and Cancel readable inverted chips while repositioning", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));

    expect(screen.getByRole("button", { name: "Save position" })).toHaveClass(
      "bg-inverted",
      "text-xs",
    );
    expect(
      screen.getByRole("button", { name: "Cancel repositioning" }),
    ).toHaveClass("bg-inverted", "text-xs");
  });

  it("removes the current cover", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove cover" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("uploads a replacement cover through Change cover", async () => {
    const user = userEvent.setup();
    const cover = new File(["cover"], "cover.png", { type: "image/png" });
    const onUpload = vi.fn().mockResolvedValue("https://example.com/new.png");
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={onUpload}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change cover" }));
    await user.upload(screen.getByLabelText("Choose cover image"), cover);

    expect(onUpload).toHaveBeenCalledWith(cover);
  });

  it("swallows upload failures without rejecting", async () => {
    const user = userEvent.setup();
    const cover = new File(["cover"], "cover.png", { type: "image/png" });
    const onUpload = vi.fn().mockRejectedValue(new Error("upload failed"));
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={onUpload}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Change cover" }));
    await expect(
      user.upload(screen.getByLabelText("Choose cover image"), cover),
    ).resolves.toBeUndefined();
  });

  it("applies object-position from coverPosition", () => {
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        coverPosition={25}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByAltText("Page cover")).toHaveStyle(
      "object-position: 50% 25%",
    );
  });

  it("saves a clamped position after dragging by delta", async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        coverPosition={40}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
        onPositionChange={onPositionChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    const repositionSurface = screen.getByRole("button", {
      name: "Adjust cover position",
    });
    vi.spyOn(repositionSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 300, 100),
    );
    // Drag down 30px on a 100px-tall band → position decreases by 30.
    fireEvent.pointerDown(repositionSurface, { pointerId: 1, clientY: 50 });
    fireEvent.pointerMove(repositionSurface, { pointerId: 1, clientY: 80 });
    fireEvent.pointerUp(repositionSurface, { pointerId: 1, clientY: 80 });
    await user.click(screen.getByRole("button", { name: "Save position" }));

    expect(onPositionChange).toHaveBeenCalledExactlyOnceWith(10);
  });

  it("does not jump the draft position on a click without drag", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        coverPosition={20}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    const repositionSurface = screen.getByRole("button", {
      name: "Adjust cover position",
    });
    vi.spyOn(repositionSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 300, 100),
    );

    fireEvent.pointerDown(repositionSurface, { pointerId: 1, clientY: 50 });
    fireEvent.pointerUp(repositionSurface, { pointerId: 1, clientY: 50 });

    expect(screen.getByAltText("Page cover")).toHaveStyle(
      "object-position: 50% 20%",
    );
  });

  it("stops updating position after pointer up", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        coverPosition={50}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    const repositionSurface = screen.getByRole("button", {
      name: "Adjust cover position",
    });
    vi.spyOn(repositionSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 300, 100),
    );

    fireEvent.pointerDown(repositionSurface, { pointerId: 1, clientY: 40 });
    fireEvent.pointerMove(repositionSurface, { pointerId: 1, clientY: 60 });
    fireEvent.pointerUp(repositionSurface, { pointerId: 1, clientY: 60 });
    // Further moves must not pan (no sticky drag).
    fireEvent.pointerMove(repositionSurface, { pointerId: 1, clientY: 90 });

    expect(screen.getByAltText("Page cover")).toHaveStyle(
      "object-position: 50% 30%",
    );
  });

  it("cancels a reposition draft with Cancel and Escape", async () => {
    const user = userEvent.setup();
    const onPositionChange = vi.fn();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
        onPositionChange={onPositionChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    await user.click(
      screen.getByRole("button", { name: "Cancel repositioning" }),
    );
    expect(onPositionChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));
    await user.keyboard("{Escape}");
    expect(onPositionChange).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Save position" }),
    ).not.toBeInTheDocument();
  });

  it("opens the lightbox from View", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View cover" }));

    expect(screen.getByRole("dialog", { name: "Cover image" })).toBeVisible();
  });

  it("delegates View to onViewCover instead of nesting a lightbox", async () => {
    const user = userEvent.setup();
    const onViewCover = vi.fn();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
        onViewCover={onViewCover}
      />,
    );

    await user.click(screen.getByRole("button", { name: "View cover" }));

    expect(onViewCover).toHaveBeenCalledExactlyOnceWith(
      "https://example.com/cover.jpg",
    );
    expect(
      screen.queryByRole("dialog", { name: "Cover image" }),
    ).not.toBeInTheDocument();
  });

  it("does not open the lightbox for control clicks", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reposition cover" }));

    expect(
      screen.queryByRole("dialog", { name: "Cover image" }),
    ).not.toBeInTheDocument();
  });
});

describe("AddCoverButton", () => {
  it("accepts AVIF among cover image types", () => {
    renderWithProviders(<AddCoverButton onUpload={vi.fn()} />);

    expect(screen.getByLabelText("Choose cover image")).toHaveAttribute(
      "accept",
      expect.stringContaining("image/avif"),
    );
  });

  it("uploads a cover selected through the add control", async () => {
    const user = userEvent.setup();
    const cover = new File(["cover"], "cover.png", { type: "image/png" });
    const onUpload = vi.fn().mockResolvedValue("https://example.com/cover.png");
    renderWithProviders(<AddCoverButton onUpload={onUpload} />);

    await user.click(screen.getByRole("button", { name: "Add cover" }));
    await user.upload(screen.getByLabelText("Choose cover image"), cover);

    expect(onUpload).toHaveBeenCalledWith(cover);
  });
});
