import { describe, expect, it } from "vitest";

import { boolAttr, stringAttr } from "./data-attr";

// A real element carrying the given attributes, for exercising parseHTML.
function fakeEl(attrs: Record<string, string>): HTMLElement {
  const el = document.createElement("div");
  for (const [name, value] of Object.entries(attrs)) {
    el.setAttribute(name, value);
  }
  return el;
}

describe("stringAttr", () => {
  it("defaults to null and reads back data-<kebab-key>", () => {
    const spec = stringAttr("siteName");
    expect(spec.default).toBeNull();
    expect(spec.parseHTML(fakeEl({ "data-site-name": "ACME" }))).toBe("ACME");
    expect(spec.parseHTML(fakeEl({}))).toBeNull();
  });

  it("omits the attribute when the value is falsy", () => {
    const spec = stringAttr("label");
    expect(spec.renderHTML({ label: "Home" })).toEqual({
      "data-label": "Home",
    });
    expect(spec.renderHTML({ label: null })).toEqual({});
    expect(spec.renderHTML({ label: "" })).toEqual({});
  });

  it("falls back to a provided default on parse", () => {
    const spec = stringAttr("status", { default: "ready" });
    expect(spec.default).toBe("ready");
    expect(spec.parseHTML(fakeEl({}))).toBe("ready");
    expect(spec.parseHTML(fakeEl({ "data-status": "loading" }))).toBe(
      "loading",
    );
  });

  it("always emits the attribute when always:true", () => {
    const spec = stringAttr("targetType", {
      default: "document",
      always: true,
    });
    expect(spec.renderHTML({ targetType: "book" })).toEqual({
      "data-target-type": "book",
    });
    expect(spec.renderHTML({ targetType: "" })).toEqual({
      "data-target-type": "",
    });
  });
});

describe("boolAttr", () => {
  it("writes 'true' only when set, reads via === 'true'", () => {
    const spec = boolAttr("showSubtitle");
    expect(spec.default).toBe(false);
    expect(spec.parseHTML(fakeEl({ "data-show-subtitle": "true" }))).toBe(true);
    expect(spec.parseHTML(fakeEl({}))).toBe(false);
    expect(spec.renderHTML({ showSubtitle: true })).toEqual({
      "data-show-subtitle": "true",
    });
    expect(spec.renderHTML({ showSubtitle: false })).toEqual({});
  });

  it("inverts when the default is true: writes 'false' only when cleared", () => {
    const spec = boolAttr("subtitleItalic", { default: true });
    expect(spec.default).toBe(true);
    expect(spec.parseHTML(fakeEl({}))).toBe(true);
    expect(spec.parseHTML(fakeEl({ "data-subtitle-italic": "false" }))).toBe(
      false,
    );
    expect(spec.renderHTML({ subtitleItalic: false })).toEqual({
      "data-subtitle-italic": "false",
    });
    expect(spec.renderHTML({ subtitleItalic: true })).toEqual({});
  });
});
