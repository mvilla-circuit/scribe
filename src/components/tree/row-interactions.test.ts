import type { KeyboardEvent, MouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { rowActivationHandlers } from "./row-interactions";

// The handlers only read `key` and call preventDefault/stopPropagation, so a
// minimal partial stand-in is enough for these pure-logic tests.
function keyEvent(key: string, preventDefault = vi.fn()) {
  // eslint-disable-next-line no-restricted-syntax -- intentional partial event stand-in for a pure handler test
  return { key, preventDefault } as unknown as KeyboardEvent;
}

function mouseEvent(stopPropagation = vi.fn()) {
  // eslint-disable-next-line no-restricted-syntax -- intentional partial event stand-in for a pure handler test
  return { stopPropagation } as unknown as MouseEvent;
}

describe("rowActivationHandlers", () => {
  it("activates on click when not editing", () => {
    const onActivate = vi.fn();
    const onStartRename = vi.fn();
    const { onClick } = rowActivationHandlers({
      editing: false,
      onActivate,
      onStartRename,
    });

    onClick();

    expect(onActivate).toHaveBeenCalledOnce();
    expect(onStartRename).not.toHaveBeenCalled();
  });

  it("ignores click while editing", () => {
    const onActivate = vi.fn();
    const { onClick } = rowActivationHandlers({
      editing: true,
      onActivate,
      onStartRename: vi.fn(),
    });

    onClick();

    expect(onActivate).not.toHaveBeenCalled();
  });

  it("activates on Enter and Space, preventing the default scroll/submit", () => {
    const onActivate = vi.fn();
    const { onKeyDown } = rowActivationHandlers({
      editing: false,
      onActivate,
      onStartRename: vi.fn(),
    });

    for (const key of ["Enter", " "]) {
      const preventDefault = vi.fn();
      onKeyDown(keyEvent(key, preventDefault));
      expect(preventDefault).toHaveBeenCalledOnce();
    }
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("starts a rename on F2", () => {
    const onActivate = vi.fn();
    const onStartRename = vi.fn();
    const { onKeyDown } = rowActivationHandlers({
      editing: false,
      onActivate,
      onStartRename,
    });

    onKeyDown(keyEvent("F2"));

    expect(onStartRename).toHaveBeenCalledOnce();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("ignores keyboard input while editing", () => {
    const onActivate = vi.fn();
    const onStartRename = vi.fn();
    const { onKeyDown } = rowActivationHandlers({
      editing: true,
      onActivate,
      onStartRename,
    });

    onKeyDown(keyEvent("Enter"));
    onKeyDown(keyEvent("F2"));

    expect(onActivate).not.toHaveBeenCalled();
    expect(onStartRename).not.toHaveBeenCalled();
  });

  it("starts a rename on double-click and stops propagation", () => {
    const onStartRename = vi.fn();
    const stopPropagation = vi.fn();
    const { onDoubleClick } = rowActivationHandlers({
      editing: false,
      onActivate: vi.fn(),
      onStartRename,
    });

    onDoubleClick(mouseEvent(stopPropagation));

    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onStartRename).toHaveBeenCalledOnce();
  });

  it("does not rename on double-click while editing (but still stops propagation)", () => {
    const onStartRename = vi.fn();
    const stopPropagation = vi.fn();
    const { onDoubleClick } = rowActivationHandlers({
      editing: true,
      onActivate: vi.fn(),
      onStartRename,
    });

    onDoubleClick(mouseEvent(stopPropagation));

    expect(stopPropagation).toHaveBeenCalledOnce();
    expect(onStartRename).not.toHaveBeenCalled();
  });
});
