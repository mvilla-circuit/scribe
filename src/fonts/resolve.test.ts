import { describe, expect, it } from "vitest";

import { DEFAULT_FONT_ID } from "./catalog";
import { resolveFonts } from "./resolve";

describe("resolveFonts", () => {
  it("falls back to every role's System default with no layers", () => {
    expect(resolveFonts()).toEqual(DEFAULT_FONT_ID);
  });

  it("lets a higher-priority layer win per role", () => {
    const resolved = resolveFonts(
      { display: "fraunces", text: "lora" },
      { display: "playfair-display" },
    );
    expect(resolved.display).toBe("playfair-display");
    expect(resolved.text).toBe("lora");
    expect(resolved.code).toBe(DEFAULT_FONT_ID.code);
  });

  it("ignores null/undefined layers and unset roles", () => {
    const resolved = resolveFonts(null, { text: "inter" }, undefined);
    expect(resolved.text).toBe("inter");
    expect(resolved.display).toBe(DEFAULT_FONT_ID.display);
  });
});
