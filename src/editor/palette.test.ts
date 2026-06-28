import { describe, expect, it } from "vitest";

import {
  BANNER_COLORS,
  CALLOUT_COLORS,
  CALLOUT_DEFAULT,
  HIGHLIGHT_COLORS,
  QUOTE_ACCENTS,
  type Swatch,
  TABLE_CELL_COLORS,
  TABLE_HEADER_COLORS,
  TEXT_COLORS,
} from "./palette";

// Every palette is a calm fourteen-hue sweep that closes on the theme-aware
// "Ink" tone, so each row of swatches stays aligned across the editor surfaces.
const FOURTEEN_HUE_PALETTES: Record<string, Swatch[]> = {
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  QUOTE_ACCENTS,
  CALLOUT_COLORS,
  TABLE_HEADER_COLORS,
  TABLE_CELL_COLORS,
};

describe("palette invariants", () => {
  it.each(Object.entries(FOURTEEN_HUE_PALETTES))(
    "%s has 14 entries ending on Ink with unique values",
    (_name, palette) => {
      expect(palette).toHaveLength(14);
      expect(palette.at(-1)?.name).toBe("Ink");
      expect(new Set(palette.map((s) => s.value)).size).toBe(palette.length);
    },
  );

  it("derives BANNER_COLORS from TEXT_COLORS with Ink dropped", () => {
    expect(BANNER_COLORS.some((s) => s.name === "Ink")).toBe(false);
    expect(BANNER_COLORS).toEqual(TEXT_COLORS.filter((s) => s.name !== "Ink"));
  });

  it("defaults a fresh callout to the Info variant", () => {
    expect(CALLOUT_DEFAULT.name).toBe("Info");
    expect(CALLOUT_DEFAULT.color).toBe(CALLOUT_COLORS[8]?.value);
  });
});
