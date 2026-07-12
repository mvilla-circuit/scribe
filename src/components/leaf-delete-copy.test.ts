import { describe, expect, it } from "vitest";

import { leafDeleteDescription, leafDeleteTitle } from "./leaf-delete-copy";

describe("leafDeleteTitle", () => {
  it("wraps the title in Delete quotes", () => {
    expect(leafDeleteTitle("Opening scene")).toBe('Delete "Opening scene"?');
  });
});

describe("leafDeleteDescription", () => {
  it("uses doc wording for entry", () => {
    expect(leafDeleteDescription("entry")).toBe(
      "This permanently deletes the doc.",
    );
  });

  it("mentions rows for datagrid", () => {
    expect(leafDeleteDescription("datagrid")).toBe(
      "This permanently deletes the datagrid and all its rows.",
    );
  });

  it("uses whiteboard wording", () => {
    expect(leafDeleteDescription("whiteboard")).toBe(
      "This permanently deletes the whiteboard.",
    );
  });
});
