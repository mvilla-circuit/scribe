import { describe, expect, it, vi } from "vitest";

import { openLinkFromEvent, resolveLinkHref } from "./link-interaction";

describe("resolveLinkHref", () => {
  it("returns the href when the target is an inner element inside a link", () => {
    const container = document.createElement("div");
    container.innerHTML =
      '<a href="https://example.com/x"><span>inner</span></a>';
    const span = container.querySelector("span");

    expect(resolveLinkHref(span)).toBe("https://example.com/x");
  });

  it("returns null for a non-link element", () => {
    const container = document.createElement("div");
    container.innerHTML = "<p><span>plain</span></p>";
    const span = container.querySelector("span");

    expect(resolveLinkHref(span)).toBeNull();
  });
});

describe("openLinkFromEvent", () => {
  function linkTarget(): EventTarget {
    const container = document.createElement("div");
    container.innerHTML =
      '<a href="https://example.com/x"><span>inner</span></a>';
    const span = container.querySelector("span");
    if (!span) throw new Error("expected span");
    return span;
  }

  it("opens the href and returns true for a plain click on a link", () => {
    const openUrl = vi.fn();
    const result = openLinkFromEvent(
      { button: 0, target: linkTarget() },
      { openUrl, hasTextSelection: false },
    );

    expect(result).toBe(true);
    expect(openUrl).toHaveBeenCalledWith("https://example.com/x");
  });

  it("returns false and does not open when there is a text selection", () => {
    const openUrl = vi.fn();
    const result = openLinkFromEvent(
      { button: 0, target: linkTarget() },
      { openUrl, hasTextSelection: true },
    );

    expect(result).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("returns false for a non-link target", () => {
    const openUrl = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = "<p><span>plain</span></p>";
    const span = container.querySelector("span");

    const result = openLinkFromEvent(
      { button: 0, target: span },
      { openUrl, hasTextSelection: false },
    );

    expect(result).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("returns false when the button is not the primary button", () => {
    const openUrl = vi.fn();
    const result = openLinkFromEvent(
      { button: 1, target: linkTarget() },
      { openUrl, hasTextSelection: false },
    );

    expect(result).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("returns false for a modified click (e.g. shift to extend a selection)", () => {
    const openUrl = vi.fn();
    const result = openLinkFromEvent(
      { button: 0, target: linkTarget(), shiftKey: true },
      { openUrl, hasTextSelection: false },
    );

    expect(result).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });
});
