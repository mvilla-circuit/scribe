import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const settingsDialog = readFileSync(
  resolve("src/components/settings/settings-dialog.tsx"),
  "utf8",
);

describe("FontPreview typography contract", () => {
  it("uses the resolved font metrics for every preview role", () => {
    for (const variable of [
      "--font-display",
      "--font-display-size",
      "--font-display-regular",
      "--font-display-line",
      "--font-display-spacing",
      "--font-text",
      "--font-text-size",
      "--font-text-regular",
      "--font-text-bold",
      "--font-text-line",
      "--font-text-spacing",
      "--font-code",
      "--font-code-size",
      "--font-code-regular",
      "--font-code-line",
      "--font-code-spacing",
    ]) {
      expect(settingsDialog).toContain(variable);
    }
  });
});
