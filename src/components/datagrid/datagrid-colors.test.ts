import { describe, expect, it } from "vitest";

import {
  DATAGRID_SWATCHES,
  DEFAULT_SWATCH,
  isDatagridSwatch,
  swatchChipStyle,
  swatchDotStyle,
  swatchForIndex,
} from "./datagrid-colors";

describe("datagrid swatch colors", () => {
  it("recognizes known hues and rejects unknown ones", () => {
    expect(isDatagridSwatch("sky")).toBe(true);
    expect(isDatagridSwatch("not-a-hue")).toBe(false);
    expect(isDatagridSwatch(null)).toBe(false);
  });

  it("styles a chip with the hue's token wash and solid tone", () => {
    const style = swatchChipStyle("sky");
    expect(style.color).toBe("var(--swatch-sky)");
    expect(style.backgroundColor).toContain("var(--swatch-sky-rgb)");
  });

  it("falls back to the neutral swatch for unknown colors", () => {
    const style = swatchChipStyle("bogus");
    expect(style.color).toBe(`var(--swatch-${DEFAULT_SWATCH})`);
  });

  it("styles a solid dot with the hue token", () => {
    expect(swatchDotStyle("moss").backgroundColor).toBe("var(--swatch-moss)");
  });

  it("cycles palette hues for successive option indices", () => {
    expect(swatchForIndex(0)).toBe(DATAGRID_SWATCHES[0]);
    expect(swatchForIndex(DATAGRID_SWATCHES.length)).toBe(DATAGRID_SWATCHES[0]);
    expect(DATAGRID_SWATCHES).toContain(swatchForIndex(5));
  });
});
