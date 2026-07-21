import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScribeLogo } from "./scribe-logo";

const { ensureFontReady, isCardillacAllowed } = vi.hoisted(() => ({
  ensureFontReady: vi.fn(() => Promise.resolve(true)),
  isCardillacAllowed: vi.fn(() => true),
}));

vi.mock("@/fonts/load-font", () => ({ ensureFontReady }));
vi.mock("@/fonts/brand", () => ({
  BRAND_FONT_ID: "cardillac",
  isCardillacAllowed,
}));

describe("ScribeLogo", () => {
  beforeEach(() => {
    ensureFontReady.mockClear();
    isCardillacAllowed.mockReset();
    isCardillacAllowed.mockReturnValue(true);
    ensureFontReady.mockImplementation(() => Promise.resolve(true));
  });

  it("renders the Scribe wordmark in the Cardillac brand face", async () => {
    render(<ScribeLogo />);

    const wordmark = screen.getByText("Scribe");
    expect(wordmark).toHaveClass("italic");
    expect(wordmark).toHaveStyle({ fontFamily: "var(--font-brand)" });
    await waitFor(() => {
      expect(wordmark).toHaveStyle({ opacity: "1" });
    });
  });

  it("waits for Cardillac cuts before showing the wordmark", async () => {
    let finish!: (ready: boolean) => void;
    ensureFontReady.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );

    render(<ScribeLogo />);

    expect(ensureFontReady).toHaveBeenCalledWith("cardillac", [500, 600]);
    expect(screen.getByText("Scribe")).toHaveStyle({ opacity: "0" });

    finish(true);
    await waitFor(() => {
      expect(screen.getByText("Scribe")).toHaveStyle({ opacity: "1" });
    });
  });

  it("shows the wordmark even when Cardillac fails to become ready", async () => {
    ensureFontReady.mockResolvedValue(false);

    render(<ScribeLogo />);

    await waitFor(() => {
      expect(screen.getByText("Scribe")).toHaveStyle({ opacity: "1" });
    });
  });

  it("shows the wordmark when ensureFontReady rejects", async () => {
    ensureFontReady.mockRejectedValue(new Error("offline"));

    render(<ScribeLogo />);

    await waitFor(() => {
      expect(screen.getByText("Scribe")).toHaveStyle({ opacity: "1" });
    });
  });

  it("skips Cardillac loading when the brand face is disallowed", () => {
    isCardillacAllowed.mockReturnValue(false);

    render(<ScribeLogo />);

    expect(ensureFontReady).not.toHaveBeenCalled();
    expect(screen.getByText("Scribe")).toHaveStyle({ opacity: "1" });
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
