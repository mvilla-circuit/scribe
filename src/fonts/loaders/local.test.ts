import { afterEach, describe, expect, it } from "vitest";

import { isLocalFont, localLoader } from "./local";

afterEach(() => {
  for (const id of ["tabular", "cardillac", "frygia", "industry"]) {
    document.querySelector(`[data-scribe-local-fonts="${id}"]`)?.remove();
  }
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

  it("maps static Regular/Bold cuts to lab metric weights (500/600)", async () => {
    for (const id of ["cardillac", "frygia", "industry"] as const) {
      await expect(localLoader(id)()).resolves.toBeUndefined();
      const css = document.querySelector(
        `[data-scribe-local-fonts="${id}"]`,
      )?.textContent;
      expect(css).toContain("font-weight: 500");
      expect(css).toContain("font-weight: 600");
      expect(css).not.toContain("font-weight: 400");
      expect(css).not.toContain("font-weight: 700");
      expect(css).toContain(".woff2");
      expect(css).not.toContain(".otf");
    }
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
