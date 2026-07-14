import { afterEach, describe, expect, it } from "vitest";

import { isLocalFont, localLoader } from "./local";

afterEach(() => {
  document.querySelector('[data-scribe-local-fonts="tabular"]')?.remove();
});

describe("localLoader", () => {
  it("injects Tabular's variable roman and italic faces", async () => {
    await expect(localLoader("tabular")()).resolves.toBeUndefined();

    const styles = document.querySelectorAll(
      '[data-scribe-local-fonts="tabular"]',
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain('font-family: "Tabular"');
    expect(styles[0]?.textContent).toContain("Tabular-Variable.woff2");
    expect(styles[0]?.textContent).toContain("Tabular-VariableItalic.woff2");
    expect(styles[0]?.textContent).toContain("font-weight: 100 900");
    expect(styles[0]?.textContent).toContain("font-style: italic");
  });

  it("rejects an unknown local font id", async () => {
    await expect(localLoader("not-a-local-font")()).rejects.toThrow(
      "Unknown local font: not-a-local-font",
    );
  });

  it("identifies only supported local font ids", () => {
    expect(isLocalFont("tabular")).toBe(true);
    expect(isLocalFont("not-a-local-font")).toBe(false);
  });
});
