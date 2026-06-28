import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useGreeting } from "./use-greeting";

// Build local-time dates so getHours() is timezone-independent in CI.
const at = (hour: number, minute = 0) => new Date(2026, 5, 28, hour, minute, 0);

describe("useGreeting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("greets the morning before noon", () => {
    vi.setSystemTime(at(9));
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe("Good morning");
  });

  it("greets the afternoon between noon and 6pm", () => {
    vi.setSystemTime(at(13));
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe("Good afternoon");
  });

  it("greets the evening at 6pm and later", () => {
    vi.setSystemTime(at(20));
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe("Good evening");
  });

  it("updates when the time-of-day boundary passes", () => {
    vi.setSystemTime(at(11, 59));
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe("Good morning");

    // Cross noon: the boundary-aligned timeout fires and recomputes.
    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(result.current).toBe("Good afternoon");
  });

  it("recomputes on window focus after the clock moved", () => {
    vi.setSystemTime(at(17, 59));
    const { result } = renderHook(() => useGreeting());
    expect(result.current).toBe("Good afternoon");

    // Simulate a window that was asleep through 6pm, then refocused.
    act(() => {
      vi.setSystemTime(at(18, 30));
      window.dispatchEvent(new Event("focus"));
    });
    expect(result.current).toBe("Good evening");
  });

  it("stops its timer on unmount", () => {
    vi.setSystemTime(at(9));
    const { unmount } = renderHook(() => useGreeting());

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
