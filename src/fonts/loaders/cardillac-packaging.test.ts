import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const localLoaderSrc = readFileSync(
  resolve(import.meta.dirname, "local.ts"),
  "utf8",
);
const viteConfigSrc = readFileSync(resolve("vite.config.ts"), "utf8");

describe("Cardillac packaging gate", () => {
  it("loads Cardillac only through the gated @scribe/cardillac-assets alias", () => {
    expect(localLoaderSrc).toContain('@scribe/cardillac-assets');
    expect(localLoaderSrc).not.toContain("Cardillac-*.woff2");
  });

  it("aliases commercial production builds to the empty Cardillac stub", () => {
    expect(viteConfigSrc).toContain("@scribe/cardillac-assets");
    expect(viteConfigSrc).toContain("cardillac-assets-empty.ts");
    expect(viteConfigSrc).toContain('command !== "build"');
    expect(viteConfigSrc).toContain("VITE_ALLOW_CARDILLAC");
  });
});
