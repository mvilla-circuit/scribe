import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const editorCss = readFileSync(resolve("src/editor/editor.css"), "utf8");

describe("editor typography CSS contract", () => {
  it("uses role metric variables on the reading surface", () => {
    for (const variable of [
      "--font-text-size",
      "--font-text-regular",
      "--font-text-bold",
      "--font-text-line",
      "--font-text-spacing",
      "--font-display-size",
      "--font-display-regular",
      "--font-display-bold",
      "--font-display-line",
      "--font-display-spacing",
      "--font-code-size",
      "--font-code-regular",
      "--font-code-bold",
      "--font-code-line",
      "--font-code-spacing",
    ]) {
      expect(editorCss).toContain(variable);
    }
  });
});
