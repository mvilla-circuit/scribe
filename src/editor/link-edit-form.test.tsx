import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { LinkEditForm } from "./link-edit-form";

function setup(overrides: Partial<Parameters<typeof LinkEditForm>[0]> = {}) {
  const props = {
    initialHref: "",
    hasLink: false,
    onSubmit: vi.fn(),
    onRemove: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<LinkEditForm {...props} />);
  return props;
}

describe("LinkEditForm", () => {
  it("renders the input seeded with initialHref", () => {
    setup({ initialHref: "https://example.com" });
    const input = screen.getByLabelText<HTMLInputElement>("Link URL");
    expect(input.value).toBe("https://example.com");
  });

  it("submits a normalized href", () => {
    const { onSubmit } = setup();
    const input = screen.getByLabelText("Link URL");
    fireEvent.change(input, { target: { value: "example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(onSubmit).toHaveBeenCalledWith("https://example.com");
  });

  it("empty submit removes an existing link", () => {
    const { onRemove } = setup({
      initialHref: "https://example.com",
      hasLink: true,
    });
    const input = screen.getByLabelText("Link URL");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Update link" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("empty submit without a link cancels", () => {
    const { onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add link" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("Escape calls onCancel", () => {
    const { onCancel } = setup();
    const input = screen.getByLabelText("Link URL");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});
