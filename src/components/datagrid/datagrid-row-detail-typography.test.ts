import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const rowDetail = readFileSync(
  resolve("src/components/datagrid/datagrid-row-detail.tsx"),
  "utf8",
);

describe("Datagrid row detail title typography contract", () => {
  it("uses resolved display metrics for detail titles", () => {
    for (const variable of [
      "--font-display",
      "--font-display-size",
      "--font-display-regular",
    ]) {
      expect(rowDetail).toContain(variable);
    }
  });
});
