import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { ImageLightbox } from "./image-lightbox";

describe("ImageLightbox", () => {
  it("renders the image and accessible title when open", () => {
    renderWithProviders(
      <ImageLightbox
        open
        onOpenChange={vi.fn()}
        src="https://example.com/cover.jpg"
        alt="A mountain at dusk"
      />,
    );

    expect(screen.getByRole("dialog", { name: "Cover image" })).toBeVisible();
    expect(
      screen.getByRole("img", { name: "A mountain at dusk" }),
    ).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("closes when the close control is pressed", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ImageLightbox
        open
        onOpenChange={onOpenChange}
        src="https://example.com/cover.jpg"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Close image" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes when Escape is pressed", () => {
    const onOpenChange = vi.fn();
    renderWithProviders(
      <ImageLightbox
        open
        onOpenChange={onOpenChange}
        src="https://example.com/cover.jpg"
      />,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
