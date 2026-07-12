import { describe, expect, it } from "vitest";

import { describeDelete } from "./outline-delete-copy";

describe("describeDelete", () => {
  it("mentions cascaded whiteboards in the delete confirm copy", () => {
    expect(
      describeDelete({
        kind: "document",
        descendants: 0,
        whiteboardDescendants: 2,
      }),
    ).toBe("This permanently deletes the page and its 2 whiteboards.");
    expect(
      describeDelete({
        kind: "document",
        descendants: 1,
        whiteboardDescendants: 1,
      }),
    ).toBe(
      "This permanently deletes the page and its 1 nested page and 1 whiteboard.",
    );
  });
});
