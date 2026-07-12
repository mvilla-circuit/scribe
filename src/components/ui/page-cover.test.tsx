import { screen } from "@testing-library/react";
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

    expect(screen.getByRole("img", { name: "Page cover" })).toHaveAttribute(
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
    );
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
