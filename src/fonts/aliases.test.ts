import { describe, expect, it } from "vitest";

import { canonicalizeFontId, FONT_ALIASES } from "./aliases";
import { FONT_REGISTRY } from "./catalog";

describe("FONT_ALIASES", () => {
  it("maps every retired production catalog id to a shortlisted successor", () => {
    expect(FONT_ALIASES).toEqual({
      "anonymous-pro": "source-code-pro",
      "azeret-mono": "jetbrains-mono",
      "b612-mono": "jetbrains-mono",
      "bodoni-moda": "playfair-display",
      cousine: "source-code-pro",
      "courier-prime": "source-code-pro",
      "dm-sans": "inter",
      "ibm-plex-mono": "jetbrains-mono",
      "red-hat-mono": "geist-mono",
      "ubuntu-sans-mono": "ubuntu-mono",
      "victor-mono": "jetbrains-mono",
    });
  });

  it("points every alias at a live FONT_REGISTRY id", () => {
    for (const [legacy, target] of Object.entries(FONT_ALIASES)) {
      expect(FONT_REGISTRY[target], `${legacy} → ${target}`).toBeDefined();
    }
  });
});

describe("canonicalizeFontId", () => {
  it("rewrites aliases and leaves current ids unchanged", () => {
    expect(canonicalizeFontId("dm-sans")).toBe("inter");
    expect(canonicalizeFontId("inter")).toBe("inter");
  });
});
