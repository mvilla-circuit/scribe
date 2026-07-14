import { describe, expect, it } from "vitest";

import { FONT_ALIASES } from "./aliases";

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
});
