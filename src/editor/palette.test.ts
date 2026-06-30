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

// Every palette is a calm fourteen-hue sweep that closes on an "Ink" tone, so
// each row of swatches stays aligned across the editor surfaces.
const FOURTEEN_HUE_PALETTES: Record<string, Swatch[]> = {
  TEXT_COLORS,
  HIGHLIGHT_COLORS,
  QUOTE_ACCENTS,
  CALLOUT_COLORS,
  TABLE_HEADER_COLORS,
  TABLE_CELL_COLORS,
  BANNER_COLORS,
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

  it.each(Object.entries(FOURTEEN_HUE_PALETTES))(
    "%s stores every hue as a CSS-variable token, never a resolved color",
    (_name, palette) => {
      // Drop the trailing Ink swatch (its own token), then require each hue to be
      // a `var(--swatch-…)` solid or an `rgba(var(--swatch-…-rgb), a)` wash — so a
      // palette edit in index.css retints saved content instead of a baked literal.
      const SOLID = /^var\(--swatch-[a-z]+\)$/;
      const WASH = /^rgba\(var\(--swatch-[a-z]+-rgb\), \d\.\d{2}\)$/;
      for (const swatch of palette.slice(0, -1)) {
        expect(
          SOLID.test(swatch.value) || WASH.test(swatch.value),
          `${swatch.name} = ${swatch.value}`,
        ).toBe(true);
      }
    },
  );

  it("shares the solid hue sweep with TEXT_COLORS but uses a banner-specific Ink", () => {
    // The hue sweep matches TEXT_COLORS exactly...
    expect(BANNER_COLORS.slice(0, -1)).toEqual(TEXT_COLORS.slice(0, -1));
    // ...but the banner's Ink uses a token that stays dark in both themes, so it
    // never flips to near-white and hides the banner's fixed light caption.
    expect(BANNER_COLORS.at(-1)).toEqual({
      name: "Ink",
      value: "var(--swatch-banner-ink)",
    });
  });

  it("defaults a fresh callout to the Info variant", () => {
    expect(CALLOUT_DEFAULT.name).toBe("Info");
    expect(CALLOUT_DEFAULT.color).toBe(CALLOUT_COLORS[8]?.value);
  });
});
