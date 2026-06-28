import { describe, expect, it } from "vitest";

import { BASIC_BLOCK_TYPES } from "./block-types";
import { filterSlashItems } from "./slash-items";

const EXPECTED_TITLES = [
  "Text",
  "Heading 1",
  "Heading 2",
  "Heading 3",
  "Bulleted list",
  "Numbered list",
  "To-do list",
];

describe("BASIC_BLOCK_TYPES", () => {
  it("lists the shared textblock conversions in order", () => {
    expect(BASIC_BLOCK_TYPES.map((b) => b.title)).toEqual(EXPECTED_TITLES);
  });

  it("gives every entry an icon and a command", () => {
    for (const block of BASIC_BLOCK_TYPES) {
      expect(typeof block.icon).toBe("function");
      expect(typeof block.command).toBe("function");
    }
  });
});

describe("slash menu integration", () => {
  it("leads with the shared block types in registry order", () => {
    const titles = filterSlashItems("").map((item) => item.title);
    expect(titles.slice(0, EXPECTED_TITLES.length)).toEqual(EXPECTED_TITLES);
  });

  it("carries each shared block's aliases into slash filtering", () => {
    expect(filterSlashItems("todo").map((i) => i.title)).toContain(
      "To-do list",
    );
    expect(filterSlashItems("h1").map((i) => i.title)).toContain("Heading 1");
  });
});
