import { describe, expect, it } from "vitest";

import {
  DEFAULT_FONT_ID,
  FONT_REGISTRY,
  FONT_ROLES,
  resolveFontEntry,
} from "./catalog";

describe("resolveFontEntry", () => {
  it("returns the matching entry for a known id", () => {
    const entry = resolveFontEntry("lora", "text");
    expect(entry.id).toBe("lora");
    expect(entry.family).toBe("Lora");
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
  it("maps each entry under its own id", () => {
    for (const [id, entry] of Object.entries(FONT_REGISTRY)) {
      expect(entry.id).toBe(id);
    }
  });

  it("dedupes fonts shared across roles to a single entry", () => {
    // Vollkorn is offered in both Display and Text; both roles must resolve to
    // the very same registry entry rather than two competing copies.
    expect(resolveFontEntry("vollkorn", "display")).toBe(
      resolveFontEntry("vollkorn", "text"),
    );
    expect(FONT_REGISTRY.vollkorn).toBeDefined();
    expect(FONT_REGISTRY.ubuntu).toBeDefined();
  });

  it("exposes the three system defaults that DEFAULT_FONT_ID points at", () => {
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.display]?.system).toBe(true);
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.text]?.system).toBe(true);
    expect(FONT_REGISTRY[DEFAULT_FONT_ID.code]?.system).toBe(true);
  });
});
