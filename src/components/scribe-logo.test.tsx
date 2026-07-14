import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScribeLogo } from "./scribe-logo";

const { ensureFontLoaded } = vi.hoisted(() => ({
  ensureFontLoaded: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/fonts/load-font", () => ({ ensureFontLoaded }));

describe("ScribeLogo", () => {
  beforeEach(() => {
    ensureFontLoaded.mockClear();
  });

  it("renders the Scribe wordmark in the Cardillac brand face", () => {
    render(<ScribeLogo />);

    const wordmark = screen.getByText("Scribe");
    expect(wordmark).toHaveClass("italic");
    expect(wordmark).toHaveStyle({ fontFamily: "var(--font-brand)" });
  });

  it("eagerly loads the Cardillac brand face", () => {
    render(<ScribeLogo />);

    expect(ensureFontLoaded).toHaveBeenCalledWith("cardillac");
  });

  it("renders the feather brand icon alongside the wordmark", () => {
    render(<ScribeLogo />);

    // The brand mark is decorative (aria-hidden, no role), so it can't be
    // reached by an accessible query — assert the Lucide feather glyph directly.
    // eslint-disable-next-line testing-library/no-node-access -- decorative aria-hidden svg has no accessible role to query by
    const icon = document.querySelector("svg.lucide-feather");
    expect(icon).toBeInTheDocument();
  });

  it("lets callers size the wordmark via textClassName", () => {
    render(<ScribeLogo textClassName="text-3xl" />);

    expect(screen.getByText("Scribe")).toHaveClass("text-3xl");
  });
});
