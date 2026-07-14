import { describe, expect, it } from "vitest";

import {
  DISPLAY_H1,
  DISPLAY_H2,
  DISPLAY_H3,
  DISPLAY_TITLE,
} from "./type-scale";

describe("display type scale", () => {
  it("steps down from the title through heading levels", () => {
    expect(DISPLAY_TITLE).toBeGreaterThan(DISPLAY_H1);
    expect(DISPLAY_H1).toBeGreaterThan(DISPLAY_H2);
    expect(DISPLAY_H2).toBeGreaterThan(DISPLAY_H3);
  });
});
