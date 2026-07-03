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
  } = {},
) {
  const {
    document: documentOverrides,
    hasChildren = false,
    onToggleContents = vi.fn(),
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
        onBannerChange={vi.fn()}
      />
    </TooltipProvider>,
  );
  return { onToggleContents };
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
});
