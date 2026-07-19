import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render-with-query";

const { ensureFontLoaded } = vi.hoisted(() => ({
  ensureFontLoaded: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/fonts/load-font", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/fonts/load-font")>()),
  ensureFontLoaded,
}));

import { FontPicker } from "./font-picker";

function renderPicker() {
  return renderWithProviders(
    createElement(FontPicker, {
      role: "display",
      value: "aleo",
      onSelect: vi.fn(),
    }),
  );
}

describe("FontPicker", () => {
  beforeEach(() => {
    ensureFontLoaded.mockClear();
  });

  it("loads only the selected font when its option list opens", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));

    expect(ensureFontLoaded).toHaveBeenCalledTimes(1);
    expect(ensureFontLoaded).toHaveBeenCalledWith("aleo");
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

    expect(ensureFontLoaded).toHaveBeenCalledWith("arvo");
  });

  it("uses the role's optical regular and bold weights for previews", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /aleo/i }));
    const option = screen.getByRole("button", {
      name: /aleothe quick brown fox jumps over the lazy dog/i,
    });
    const sample = within(option).getByText(/the quick brown fox/i);

    expect(sample).toHaveStyle({ fontWeight: 300 });
    expect(within(option).getByText("jumps")).toHaveStyle({ fontWeight: 800 });
  });
});
