import { describe, expect, it } from "vitest";

import { type IconValue, parseIcon, serializeIcon } from "./icon";

describe("parseIcon", () => {
  it("returns null for null, undefined, and empty values", () => {
    expect(parseIcon(null)).toBe(null);
    expect(parseIcon(undefined)).toBe(null);
    expect(parseIcon("")).toBe(null);
  });

  it("treats a bare emoji string (legacy) as an emoji icon", () => {
    expect(parseIcon("😀")).toEqual({ type: "emoji", emoji: "😀" });
  });

  it("falls back to a legacy emoji when the payload is not valid JSON", () => {
    expect(parseIcon("not json {")).toEqual({
      type: "emoji",
      emoji: "not json {",
    });
  });

  it("parses a tagged emoji icon", () => {
    const raw = JSON.stringify({ type: "emoji", emoji: "🚀" });
    expect(parseIcon(raw)).toEqual({ type: "emoji", emoji: "🚀" });
  });

  it("parses a glyph icon with and without a color", () => {
    expect(
      parseIcon(JSON.stringify({ type: "glyph", name: "star", color: "#f00" })),
    ).toEqual({ type: "glyph", name: "star", color: "#f00" });

    expect(parseIcon(JSON.stringify({ type: "glyph", name: "star" }))).toEqual({
      type: "glyph",
      name: "star",
      color: null,
    });
  });

  it("parses an image icon", () => {
    const raw = JSON.stringify({ type: "image", url: "https://x/y.png" });
    expect(parseIcon(raw)).toEqual({ type: "image", url: "https://x/y.png" });
  });

  it("treats an unrecognized tagged type as a legacy emoji", () => {
    const raw = JSON.stringify({ type: "mystery" });
    expect(parseIcon(raw)).toEqual({ type: "emoji", emoji: raw });
  });

  it("returns null when a known type is missing its required field", () => {
    expect(parseIcon(JSON.stringify({ type: "emoji" }))).toBe(null);
    expect(parseIcon(JSON.stringify({ type: "glyph" }))).toBe(null);
    expect(parseIcon(JSON.stringify({ type: "image" }))).toBe(null);
  });
});

describe("serializeIcon <-> parseIcon round-trip", () => {
  const cases: IconValue[] = [
    { type: "emoji", emoji: "✨" },
    { type: "glyph", name: "heart", color: "#abc" },
    { type: "glyph", name: "heart", color: null },
    { type: "image", url: "https://cdn/img.webp" },
  ];

  it.each(cases)("round-trips %o", (icon) => {
    expect(parseIcon(serializeIcon(icon))).toEqual(icon);
  });
});
