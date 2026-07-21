import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DISPLAY_H1,
  DISPLAY_H2,
  DISPLAY_H3,
  DISPLAY_TITLE,
} from "./type-scale";

const editorCss = readFileSync(
  resolve(import.meta.dirname, "../editor/editor.css"),
  "utf8",
);

describe("display type scale", () => {
  it("steps down from the title through heading levels", () => {
    expect(DISPLAY_TITLE).toBeGreaterThan(DISPLAY_H1);
    expect(DISPLAY_H1).toBeGreaterThan(DISPLAY_H2);
    expect(DISPLAY_H2).toBeGreaterThan(DISPLAY_H3);
  });

  it("matches the heading ratios wired in editor.css", () => {
    expect(editorCss).toContain(
      `font-size: calc(var(--font-display-size) * ${DISPLAY_H1})`,
    );
    expect(editorCss).toContain(
      `font-size: calc(var(--font-display-size) * ${DISPLAY_H2})`,
    );
    expect(editorCss).toContain(
      `font-size: calc(var(--font-display-size) * ${DISPLAY_H3})`,
    );
  });
});
