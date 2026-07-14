import { describe, expect, it } from "vitest";

import {
  DEFAULT_FONT_ID,
  FONT_FAMILIES,
  FONT_REGISTRY,
  FONT_ROLES,
  resolveFontEntry,
  ROLE_FONTS,
} from "./catalog";
import metrics from "./metrics.json";

describe("resolveFontEntry", () => {
  it("returns the matching entry for a known id", () => {
    const entry = resolveFontEntry("lora", "text");
    expect(entry.id).toBe("lora");
    expect(entry.family).toBe("Lora");
  });

  it("resolves retired catalog ids through their aliases", () => {
    expect(resolveFontEntry("bodoni-moda", "display").id).toBe(
      "playfair-display",
    );
    expect(resolveFontEntry("dm-sans", "text").id).toBe("inter");
    expect(resolveFontEntry("victor-mono", "code").id).toBe("jetbrains-mono");
  });

  it("falls back to the role's system default for an unknown id", () => {
    for (const role of FONT_ROLES) {
      expect(resolveFontEntry("does-not-exist", role).id).toBe(
        DEFAULT_FONT_ID[role],
      );
    }
  });

  it("falls back to the role's system default when no id is given", () => {
    for (const role of FONT_ROLES) {
      expect(resolveFontEntry(undefined, role).id).toBe(DEFAULT_FONT_ID[role]);
    }
  });
});

describe("FONT_REGISTRY", () => {
  it("exports the locked lab family labels", () => {
    expect(FONT_FAMILIES["red-hat-display"]).toBe("Red Hat Display");
  });

  it("maps each entry under its own id", () => {
    for (const [id, entry] of Object.entries(FONT_REGISTRY)) {
      expect(entry.id).toBe(id);
    }
  });

  it("shares each cross-role font entry by reference", () => {
    const literataDisplay = ROLE_FONTS.display.find(
      (entry) => entry.id === "literata",
    );
    const literataText = ROLE_FONTS.text.find(
      (entry) => entry.id === "literata",
    );
    expect(literataDisplay).toBe(literataText);
    expect(FONT_REGISTRY.literata).toBe(literataDisplay);
  });

  it("exposes the three system defaults that DEFAULT_FONT_ID points at", () => {
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.display]?.system).toBe(true);
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.text]?.system).toBe(true);
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.code]?.system).toBe(true);
  });
});

describe("ROLE_FONTS.text", () => {
  it("offers the System serif option", () => {
    const systemSerif = ROLE_FONTS.text.find((f) => f.id === "system-serif");
    expect(systemSerif).toBeDefined();
    expect(systemSerif?.system).toBe(true);
  });

  it("keeps System sans as default while also offering System serif", () => {
    expect(DEFAULT_FONT_ID.text).toBe("system-sans");
    expect(resolveFontEntry("system-serif", "text").id).toBe("system-serif");
  });
});

describe("ROLE_FONTS", () => {
  it("contains every id from each lab metrics shortlist", () => {
    for (const role of FONT_ROLES) {
      expect(
        [...new Set(ROLE_FONTS[role].map((entry) => entry.id))].sort(),
      ).toEqual(Object.keys(metrics[role]).sort());
    }
  });

  it("marks operating-system faces as system fonts", () => {
    for (const id of [
      "georgia",
      "hoefler-text",
      "palatino",
      "avenir-next",
      "verdana",
      "menlo",
      "sf-mono",
    ]) {
      expect(FONT_REGISTRY[id]?.system).toBe(true);
      expect(FONT_REGISTRY[id]?.load).toBeUndefined();
    }
  });
});
