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

  it("styles Reposition and View like the existing icon cover controls", () => {
    renderWithProviders(
      <PageCover
        coverUrl="https://example.com/cover.jpg"
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    for (const name of ["Reposition cover", "View cover", "Remove cover"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "bg-elevated",
        "size-8",
      );
    }
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

  it("saves a clamped position after dragging", async () => {
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
    const repositionSurface = screen.getByRole("button", {
      name: "Adjust cover position",
    });
    vi.spyOn(repositionSurface, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 300, 100),
    );
    fireEvent.pointerDown(repositionSurface, { pointerId: 1, clientY: 0 });
    fireEvent.pointerMove(repositionSurface, { pointerId: 1, clientY: 200 });
    await user.click(screen.getByRole("button", { name: "Save position" }));

    expect(onPositionChange).toHaveBeenCalledExactlyOnceWith(100);
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
