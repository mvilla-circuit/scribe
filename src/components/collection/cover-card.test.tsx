import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

import { CoverCard } from "./cover-card";

// Radix dropdowns probe pointer-capture; jsdom implements neither.
beforeEach(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CoverCard", () => {
  it("shows the subtitle under the title when one exists", () => {
    render(
      <CoverCard
        title="A Crown So Heavy"
        subtitle="Book one of the realm"
        icon={null}
        coverUrl="https://example.test/crown.jpg"
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("A Crown So Heavy")).toBeInTheDocument();
    const subtitle = screen.getByText("Book one of the realm");
    expect(subtitle).toBeInTheDocument();
    expect(subtitle).toHaveClass("text-muted", "line-clamp-2");
  });

  it("omits the subtitle row when none is set", () => {
    render(
      <CoverCard
        title="Untitled"
        icon={null}
        coverUrl={null}
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByText("Untitled")).toBeInTheDocument();
    // No secondary muted line is rendered when subtitle is absent.
    expect(
      screen.queryByText((_, node) =>
        Boolean(
          node?.classList.contains("text-muted") &&
          node.classList.contains("truncate") &&
          (node.textContent?.length ?? 0) > 0,
        ),
      ),
    ).not.toBeInTheDocument();
  });

  it("defaults the cover media to a book-cover aspect", () => {
    render(
      <CoverCard
        title="A doc page"
        icon={null}
        coverUrl={null}
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getByTestId("cover-card-media")).toHaveClass("aspect-[3/4]");
  });

  it("uses a wider album aspect when requested", () => {
    render(
      <CoverCard
        title="A collection"
        icon={null}
        coverUrl={null}
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
        aspect="album"
      />,
    );

    expect(screen.getByTestId("cover-card-media")).toHaveClass("aspect-[4/3]");
  });

  it("mounts the more-actions control on an elevated chip for contrast", () => {
    renderWithProviders(
      <CoverCard
        title="A Crown So Heavy"
        icon={null}
        coverUrl="https://example.test/crown.jpg"
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
        actions={[
          {
            icon: <span>*</span>,
            label: "Rename",
            onSelect: vi.fn(),
          },
        ]}
      />,
    );

    const chip = screen.getByTestId("cover-card-actions");
    expect(chip).toHaveClass("bg-elevated", "border-border");
    expect(
      screen.getByRole("button", { name: "Actions for A Crown So Heavy" }),
    ).toBeInTheDocument();
  });

  it("keeps the more-actions chip visible while its menu is open", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CoverCard
        title="A Crown So Heavy"
        icon={null}
        coverUrl="https://example.test/crown.jpg"
        fallback={<span>fallback</span>}
        onOpen={vi.fn()}
        actions={[
          {
            icon: <span>*</span>,
            label: "Rename",
            onSelect: vi.fn(),
          },
        ]}
      />,
    );

    const chip = screen.getByTestId("cover-card-actions");
    expect(chip).toHaveClass("opacity-0");

    await user.click(
      screen.getByRole("button", { name: "Actions for A Crown So Heavy" }),
    );

    expect(chip).toHaveClass("opacity-100");
    expect(
      await screen.findByRole("menuitem", { name: /Rename/ }),
    ).toBeInTheDocument();
  });
});
