import { describe, expect, it } from "vitest";

import { tokenize } from "./tokenize";

describe("tokenize", () => {
  it("returns words with their character offsets", () => {
    expect(tokenize("hello world")).toEqual([
      { word: "hello", from: 0, to: 5 },
      { word: "world", from: 6, to: 11 },
    ]);
  });

  it("skips urls, emails, and numbers", () => {
    const words = tokenize(
      "see https://example.com or email a@b.com about 1234",
    ).map((t) => t.word);
    expect(words).toEqual(["see", "or", "email", "about"]);
  });

  it("skips bare www. links", () => {
    const words = tokenize("visit www.example.com now").map((t) => t.word);
    expect(words).toEqual(["visit", "now"]);
  });

  it("skips alphanumeric tokens that mix letters and digits", () => {
    const words = tokenize("the h4ck3r typed abc123").map((t) => t.word);
    expect(words).toEqual(["the", "typed"]);
  });

  it("keeps contractions intact with their offsets", () => {
    expect(tokenize("I don't know")).toEqual([
      { word: "I", from: 0, to: 1 },
      { word: "don't", from: 2, to: 7 },
      { word: "know", from: 8, to: 12 },
    ]);
  });
});
