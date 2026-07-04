import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { DocumentMeta } from "@/data/documents";
import { resolveFonts } from "@/fonts/resolve";
import { makeDocument } from "@/test/fixtures";

import { PageSettingsToolbar } from "./page-settings-toolbar";

function renderToolbar(
  overrides: {
    document?: Partial<DocumentMeta>;
    hasChildren?: boolean;
    onToggleContents?: () => void;
    onToggleSpellcheck?: () => void;
  } = {},
) {
  const {
    document: documentOverrides,
    hasChildren = false,
    onToggleContents = vi.fn(),
    onToggleSpellcheck = vi.fn(),
  } = overrides;
  const { content: _content, ...meta } = makeDocument(documentOverrides);
  render(
    <TooltipProvider>
      <PageSettingsToolbar
        document={meta}
        saveState="idle"
        fontOverrides={{}}
        inheritedFonts={resolveFonts()}
        fontHandlers={{
          setFont: vi.fn(),
          clearFont: vi.fn(),
          clearAll: vi.fn(),
        }}
        hasChildren={hasChildren}
        onToggleContents={onToggleContents}
        onToggleOutline={vi.fn()}
        onToggleSubtitle={vi.fn()}
        onToggleSpellcheck={onToggleSpellcheck}
        onBannerChange={vi.fn()}
      />
    </TooltipProvider>,
  );
  return { onToggleContents, onToggleSpellcheck };
}

describe("PageSettingsToolbar", () => {
  it("shows the contents toggle only for parent docs", () => {
    renderToolbar({ hasChildren: false });
    expect(
      screen.queryByRole("button", { name: /contents/i }),
    ).not.toBeInTheDocument();

    renderToolbar({ hasChildren: true });
    expect(
      screen.getByRole("button", { name: "Show contents" }),
    ).toBeInTheDocument();
  });

  it("toggles contents visibility", async () => {
    const { onToggleContents } = renderToolbar({
      hasChildren: true,
      document: { show_contents: true },
    });

    const button = screen.getByRole("button", { name: "Hide contents" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    expect(onToggleContents).toHaveBeenCalledOnce();
  });

  it("renders the spellcheck toggle on (by default) and calls its handler", async () => {
    // makeDocument defaults spellcheck_enabled to true, matching the DB default.
    const { onToggleSpellcheck } = renderToolbar();

    const button = screen.getByRole("button", { name: "Disable spellcheck" });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(button);
    expect(onToggleSpellcheck).toHaveBeenCalledOnce();
  });

  it("shows the spellcheck toggle as off when disabled", () => {
    renderToolbar({ document: { spellcheck_enabled: false } });
    expect(
      screen.getByRole("button", { name: "Enable spellcheck" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("orders the controls Banner, Subtitle, Outline, Fonts, Spellcheck", () => {
    // Fixture defaults: no banner (null), subtitle hidden, outline shown,
    // spellcheck on — which fix each control's accessible name below.
    renderToolbar();

    const names = screen
      .getAllByRole("button")
      .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "");
    const orderOf = (label: string) => names.indexOf(label);

    const banner = orderOf("Add banner");
    const subtitle = orderOf("Show subtitle");
    const outline = orderOf("Hide outline");
    const fonts = orderOf("Fonts");
    const spellcheck = orderOf("Disable spellcheck");

    expect(banner).toBeGreaterThanOrEqual(0);
    expect(banner).toBeLessThan(subtitle);
    expect(subtitle).toBeLessThan(outline);
    expect(outline).toBeLessThan(fonts);
    expect(fonts).toBeLessThan(spellcheck);
  });
});
