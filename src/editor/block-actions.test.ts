import type { JSONContent } from "@tiptap/core";
import { describe, expect, it } from "vitest";

import { reshapeColumns } from "./block-actions";

const para = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const emptyPara: JSONContent = { type: "paragraph" };

describe("reshapeColumns", () => {
  it("flattens to the column blocks when collapsing to one column", () => {
    const result = reshapeColumns([[para("a")], [para("b")]], 1);
    expect(result).toEqual([para("a"), para("b")]);
  });

  it("collapses to a single empty paragraph when the columns are all empty", () => {
    expect(reshapeColumns([[emptyPara], [emptyPara]], 1)).toEqual([emptyPara]);
  });

  it("collapses to a single empty paragraph when the columns have no blocks", () => {
    expect(reshapeColumns([[], []], 1)).toEqual([emptyPara]);
  });

  it("folds trailing columns into the last kept one when reducing the count", () => {
    const result = reshapeColumns([[para("a")], [para("b")], [para("c")]], 2);
    expect(result).toEqual({
      type: "columns",
      content: [
        { type: "column", content: [para("a")] },
        { type: "column", content: [para("b"), para("c")] },
      ],
    });
  });

  it("appends empty columns when increasing the count", () => {
    const result = reshapeColumns([[para("a")]], 3);
    expect(result).toEqual({
      type: "columns",
      content: [
        { type: "column", content: [para("a")] },
        { type: "column", content: [emptyPara] },
        { type: "column", content: [emptyPara] },
      ],
    });
  });

  it("gives an empty source column a placeholder paragraph", () => {
    const result = reshapeColumns([[], [para("b")]], 2);
    expect(result).toEqual({
      type: "columns",
      content: [
        { type: "column", content: [emptyPara] },
        { type: "column", content: [para("b")] },
      ],
    });
  });
});
