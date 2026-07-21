import { describe, expect, it } from "vitest";

import { displayTitleStyle } from "./display-title-style";

describe("displayTitleStyle", () => {
  it("emits the full display optical metric var set", () => {
    expect(displayTitleStyle()).toEqual({
      fontFamily: "var(--font-display)",
      fontSize: "var(--font-display-size)",
      fontWeight: "var(--font-display-regular)",
      lineHeight: "var(--font-display-line)",
      letterSpacing: "var(--font-display-spacing)",
    });
  });

  it("lets callers overlay extras without dropping metrics", () => {
    expect(displayTitleStyle({ color: "red" })).toMatchObject({
      fontSize: "var(--font-display-size)",
      color: "red",
    });
  });
});
