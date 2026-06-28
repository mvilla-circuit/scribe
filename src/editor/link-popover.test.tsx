import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { LinkPopover } from "./link-popover";

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

function setup(overrides: Partial<Parameters<typeof LinkPopover>[0]> = {}) {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    mode: "view" as const,
    href: "https://example.com/x",
    hasLink: true,
    editable: true,
    anchorRect: null,
    onOpenUrl: vi.fn(),
    onSubmit: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  renderWithProviders(<LinkPopover {...props} />);
  return props;
}

describe("LinkPopover", () => {
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
  });

  it("renders the link actions in view mode", () => {
    setup();
    expect(screen.getByText("https://example.com/x")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit link" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove link" }),
    ).toBeInTheDocument();
  });

  it("opens the url via onOpenUrl", () => {
    const { onOpenUrl } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Open link" }));
    expect(onOpenUrl).toHaveBeenCalled();
  });

  it("Copy writes the url to the clipboard", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("https://example.com/x");
  });

  it("reveals the edit form on Edit", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
    expect(screen.getByLabelText("Link URL")).toBeInTheDocument();
  });

  it("hides Edit/Remove when not editable", () => {
    setup({ editable: false });
    expect(
      screen.queryByRole("button", { name: "Edit link" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove link" }),
    ).not.toBeInTheDocument();
  });

  it("shows the input directly in add mode", () => {
    setup({ mode: "add", hasLink: false, href: "" });
    expect(screen.getByLabelText("Link URL")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open link" }),
    ).not.toBeInTheDocument();
  });

  it("returns to view mode on reopen after an edit", () => {
    const props = {
      onOpenChange: vi.fn(),
      mode: "view" as const,
      href: "https://example.com/x",
      hasLink: true,
      editable: true,
      anchorRect: null,
      onOpenUrl: vi.fn(),
      onSubmit: vi.fn(),
      onRemove: vi.fn(),
    };
    const { rerender } = renderWithProviders(<LinkPopover open {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Edit link" }));
    expect(screen.getByLabelText("Link URL")).toBeInTheDocument();

    // Close (hover ends), then reopen for the next hovered link.
    rerender(<LinkPopover open={false} {...props} />);
    rerender(<LinkPopover open {...props} />);

    expect(screen.queryByLabelText("Link URL")).not.toBeInTheDocument();
    expect(screen.getByText("https://example.com/x")).toBeInTheDocument();
  });
});
