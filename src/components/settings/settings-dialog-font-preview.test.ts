import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const settingsDialog = readFileSync(
  resolve("src/components/settings/settings-dialog.tsx"),
  "utf8",
);

describe("FontPreview typography contract", () => {
  it("uses displayTitleStyle for the display preview", () => {
    expect(settingsDialog).toContain("displayTitleStyle()");
  });

  it("uses the resolved font metrics for text and code previews", () => {
    for (const variable of [
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
