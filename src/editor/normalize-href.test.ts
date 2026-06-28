import { describe, expect, it } from "vitest";

import { normalizeHref } from "./normalize-href";

describe("normalizeHref", () => {
  it("prefixes a scheme-less domain with https://", () => {
    expect(normalizeHref("example.com")).toBe("https://example.com");
    expect(normalizeHref("www.example.com/path?q=1")).toBe(
      "https://www.example.com/path?q=1",
    );
  });

  it("leaves an existing scheme untouched", () => {
    expect(normalizeHref("http://example.com")).toBe("http://example.com");
    expect(normalizeHref("https://example.com")).toBe("https://example.com");
    expect(normalizeHref("mailto:hi@example.com")).toBe(
      "mailto:hi@example.com",
    );
    expect(normalizeHref("tel:+15551234567")).toBe("tel:+15551234567");
  });

  it("leaves relative paths and anchors untouched", () => {
    expect(normalizeHref("/about")).toBe("/about");
    expect(normalizeHref("#section")).toBe("#section");
    expect(normalizeHref("?q=term")).toBe("?q=term");
  });

  it("returns an empty string for empty or whitespace input", () => {
    expect(normalizeHref("")).toBe("");
    expect(normalizeHref("   ")).toBe("");
  });

  it("trims surrounding whitespace before normalizing", () => {
    expect(normalizeHref("  example.com  ")).toBe("https://example.com");
    expect(normalizeHref("  https://example.com  ")).toBe(
      "https://example.com",
    );
  });
});
