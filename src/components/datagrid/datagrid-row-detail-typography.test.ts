import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const rowDetail = readFileSync(
  resolve("src/components/datagrid/datagrid-row-detail.tsx"),
  "utf8",
);

describe("Datagrid row detail title typography contract", () => {
  it("uses displayTitleStyle for detail titles", () => {
    expect(rowDetail).toContain("displayTitleStyle()");
  });
});
