import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { clearFontOverride, setFontOverride } from "./overrides";
import { useFontOverrides } from "./use-font-overrides";

describe("setFontOverride", () => {
  it("adds a role without mutating the input", () => {
    const overrides = { text: "lora" };
    const next = setFontOverride(overrides, "display", "playfair");
    expect(next).toEqual({ text: "lora", display: "playfair" });
    expect(overrides).toEqual({ text: "lora" });
  });

  it("overwrites an existing role", () => {
    expect(setFontOverride({ display: "a" }, "display", "b")).toEqual({
      display: "b",
    });
  });
});

describe("clearFontOverride", () => {
  it("removes a role and returns the remaining map", () => {
    const overrides = { display: "a", text: "b" };
    expect(clearFontOverride(overrides, "display", false)).toEqual({
      text: "b",
    });
    expect(overrides).toEqual({ display: "a", text: "b" });
  });

  it("collapses to null when the last role is removed and collapseEmpty is set", () => {
    expect(clearFontOverride({ display: "a" }, "display", true)).toBeNull();
  });

  it("keeps an empty map when the last role is removed and collapseEmpty is off", () => {
    expect(clearFontOverride({ display: "a" }, "display", false)).toEqual({});
  });

  it("does not collapse when other roles remain, even with collapseEmpty", () => {
    expect(
      clearFontOverride({ display: "a", text: "b" }, "display", true),
    ).toEqual({ text: "b" });
  });
});

describe("useFontOverrides", () => {
  it("emits the merged map on setFont", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useFontOverrides({ overrides: { text: "lora" }, onChange }),
    );
    result.current.setFont("display", "playfair");
    expect(onChange).toHaveBeenCalledWith({
      text: "lora",
      display: "playfair",
    });
  });

  it("emits null on clearFont when collapseEmpty drops the last role (page scope)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useFontOverrides({
        overrides: { display: "a" },
        onChange,
        collapseEmpty: true,
      }),
    );
    result.current.clearFont("display");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("emits an empty map on clearAll by default (book scope)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useFontOverrides({ overrides: { display: "a" }, onChange }),
    );
    result.current.clearAll();
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("emits null on clearAll when collapseEmpty is set (page scope)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useFontOverrides({ overrides: {}, onChange, collapseEmpty: true }),
    );
    result.current.clearAll();
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
