import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLE_FONTS } from "@/fonts/catalog";
import { renderWithProviders } from "@/test/render-with-query";

const { ensureFontLoaded, ensureFontReady, isFontLoaded, loadedIds } =
  vi.hoisted(() => {
    const loadedIds = new Set<string>();
    const ensureFontLoaded = vi.fn((fontId: string) => {
      loadedIds.add(fontId);
      return Promise.resolve();
    });
    const isFontLoaded = vi.fn((fontId: string) => loadedIds.has(fontId));
    const ensureFontReady = vi.fn((fontId: string) =>
      ensureFontLoaded(fontId).then(() => isFontLoaded(fontId)),
    );
    return { loadedIds, ensureFontLoaded, ensureFontReady, isFontLoaded };
  });

vi.mock("@/fonts/load-font", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/fonts/load-font")>()),
  ensureFontLoaded,
  ensureFontReady,
  isFontLoaded,
}));
import { FontPicker } from "./font-picker";

function renderPicker(value = "aleo") {
  return renderWithProviders(
    createElement(FontPicker, {
      role: "display",
      value,
      onSelect: vi.fn(),
    }),
  );
}

describe("FontPicker", () => {
  beforeEach(() => {
    loadedIds.clear();
    ensureFontLoaded.mockClear();
    ensureFontReady.mockClear();
    isFontLoaded.mockClear();
    ensureFontReady.mockImplementation((fontId: string) =>
      ensureFontLoaded(fontId).then(() => isFontLoaded(fontId)),
    );
    ensureFontLoaded.mockImplementation((fontId: string) => {
      loadedIds.add(fontId);
      return Promise.resolve();
    });
  });

  it("loads only the selected font when its option list opens", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));

    expect(ensureFontLoaded).toHaveBeenCalledWith("aleo");
    expect(ensureFontLoaded.mock.calls.every(([id]) => id === "aleo")).toBe(
      true,
    );
  });

  it("loads an option when the user hovers its preview", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));
    await user.hover(
      screen.getByRole("button", {
        name: /arvothe quick brown fox jumps over the lazy dog/i,
      }),
    );

    expect(ensureFontReady).toHaveBeenCalledWith("arvo", expect.any(Array));
  });

  it("keeps the trigger on chrome type until the selected face is cut-ready", async () => {
    let finishAleo!: () => void;
    ensureFontReady.mockImplementation((fontId: string) => {
      if (fontId === "aleo") {
        return new Promise<boolean>((resolve) => {
          finishAleo = () => {
            loadedIds.add(fontId);
            resolve(true);
          };
        });
      }
      return Promise.resolve(false);
    });

    renderPicker("aleo");
    const trigger = screen.getByRole("button", { name: /aleo/i });
    const label = within(trigger).getByText("Aleo");

    expect(label.style.fontFamily).toBe("");

    finishAleo();
    await waitFor(() => {
      expect(label.style.fontFamily).toMatch(/Aleo/i);
    });
  });

  it("keeps unloaded option samples on chrome type so hover load does not FOUT", async () => {
    const user = userEvent.setup();
    let finishArvo!: () => void;
    ensureFontReady.mockImplementation(async (fontId: string) => {
      if (fontId === "aleo") {
        loadedIds.add(fontId);
        return true;
      }
      if (fontId === "arvo") {
        await new Promise<void>((resolve) => {
          finishArvo = resolve;
        });
        loadedIds.add(fontId);
        return true;
      }
      return false;
    });

    renderPicker();
    await user.click(screen.getByRole("button", { name: /aleo/i }));

    const arvo = screen.getByRole("button", {
      name: /arvothe quick brown fox jumps over the lazy dog/i,
    });
    const sample = within(arvo).getByText(/the quick brown fox/i);

    expect(sample.style.fontFamily).not.toMatch(/Arvo/i);
    expect(sample.style.fontWeight).toBe("");

    await user.hover(arvo);
    expect(ensureFontReady).toHaveBeenCalledWith("arvo", expect.any(Array));
    expect(sample.style.fontFamily).not.toMatch(/Arvo/i);

    finishArvo();
    await waitFor(() => {
      expect(sample.style.fontFamily).toMatch(/Arvo/i);
    });
  });

  it("uses the role's optical regular and bold weights for previews", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));
    const option = screen.getByRole("button", {
      name: /aleothe quick brown fox jumps over the lazy dog/i,
    });
    const sample = await waitFor(() => {
      const node = within(option).getByText(/the quick brown fox/i);
      expect(node).toHaveStyle({ fontWeight: 300 });
      return node;
    });

    expect(sample).toHaveStyle({ fontWeight: 300 });
    expect(within(option).getByText("jumps")).toHaveStyle({ fontWeight: 800 });
  });

  it("lists serif options alphabetically by family name", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));

    const expectedIds = ROLE_FONTS.display
      .filter((f) => !f.system && f.style === "serif")
      .slice()
      .sort((a, b) => a.family.localeCompare(b.family))
      .map((f) => f.id);

    const renderedIds = screen
      .getAllByRole("button")
      .map((btn) => btn.getAttribute("data-font-id"))
      .filter((id): id is string => id != null && expectedIds.includes(id));

    expect(renderedIds).toEqual(expectedIds);
  });

  it("scrolls the selected option into view when the popover opens", async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderPicker("playfair-display");
    await user.click(screen.getByRole("button", { name: /playfair display/i }));

    const selected = screen.getByRole("button", {
      name: /playfair displaythe quick brown fox/i,
    });
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
    expect(scrollIntoView.mock.instances).toContain(selected);
  });
});
