import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CoverCard } from "./cover-card";

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
    expect(subtitle).toHaveClass("text-muted");
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
});
