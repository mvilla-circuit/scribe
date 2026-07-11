import { QueryClient } from "@tanstack/react-query";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { whiteboardSceneKey, whiteboardsKey } from "@/data/query-keys";
import type { Json } from "@/lib/database.types";
import { sceneToJson, type WhiteboardScene } from "@/lib/whiteboard-scene";
import { makeWhiteboard } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render-with-query";

import { WhiteboardPage } from "./whiteboard-page";

const { toastError, updateSceneMutate } = vi.hoisted(() => ({
  toastError: vi.fn(),
  updateSceneMutate: vi.fn(),
}));

vi.mock("@/data/whiteboards", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/whiteboards")>();
  return {
    ...actual,
    useUpdateWhiteboardScene: () => ({ mutate: updateSceneMutate }),
  };
});
vi.mock("sonner", () => ({ toast: { error: toastError } }));

// A client that treats seeded data as fresh, so the page's structural + scene
// queries resolve from the cache without refetching over the network.
function seededClient(sceneJson: Json): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  client.setQueryData(whiteboardsKey, [
    makeWhiteboard({ id: "whiteboard-1", name: "Ideas" }),
  ]);
  client.setQueryData(whiteboardSceneKey("whiteboard-1"), sceneJson);
  return client;
}

function emptyScene(): WhiteboardScene {
  return { version: 1, camera: { x: 0, y: 0, zoom: 1 }, items: [] };
}

function twoStickyScene(): WhiteboardScene {
  return {
    version: 1,
    camera: { x: 0, y: 0, zoom: 1 },
    items: [
      {
        id: "s1",
        type: "sticky",
        x: 10,
        y: 20,
        w: 180,
        h: 180,
        z: 1,
        text: "one",
        color: "yellow",
      },
      {
        id: "s2",
        type: "sticky",
        x: 300,
        y: 20,
        w: 180,
        h: 180,
        z: 2,
        text: "two",
        color: "blue",
      },
    ],
  };
}

function itemNodes(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-testid^="whiteboard-item-"]',
    ),
  );
}

describe("WhiteboardPage", () => {
  beforeEach(() => {
    toastError.mockClear();
    updateSceneMutate.mockClear();
  });

  it("toolbar buttons add a sticky, text, and frame item", () => {
    const { container } = renderWithProviders(
      <WhiteboardPage whiteboardId="whiteboard-1" />,
      { client: seededClient(sceneToJson(emptyScene())) },
    );

    expect(itemNodes(container)).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
    fireEvent.click(screen.getByRole("button", { name: "Add text" }));
    fireEvent.click(screen.getByRole("button", { name: "Add frame" }));

    const types = itemNodes(container)
      .map((node) => node.dataset.itemType)
      .sort();
    expect(types).toEqual(["frame", "sticky", "text"]);
  });

  it("Cmd+Z after delete restores the removed item", () => {
    const { container } = renderWithProviders(
      <WhiteboardPage whiteboardId="whiteboard-1" />,
      { client: seededClient(sceneToJson(twoStickyScene())) },
    );

    expect(itemNodes(container)).toHaveLength(2);

    const s1 = screen.getByTestId("whiteboard-item-s1");
    fireEvent.pointerDown(s1, { clientX: 20, clientY: 30, button: 0 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 30 });
    screen.getByTestId("whiteboard-canvas").focus();
    fireEvent.keyDown(window, { key: "Delete" });

    expect(itemNodes(container)).toHaveLength(1);

    fireEvent.keyDown(window, { key: "z", metaKey: true });

    expect(itemNodes(container)).toHaveLength(2);
    expect(screen.getByTestId("whiteboard-item-s1")).toBeInTheDocument();
  });

  it("reports corrupt persisted scene data once", () => {
    const client = seededClient({ version: 1, items: [] });

    const { rerender } = renderWithProviders(
      <WhiteboardPage whiteboardId="whiteboard-1" />,
      { client },
    );
    rerender(<WhiteboardPage whiteboardId="whiteboard-1" />);

    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith(
      "Couldn't read this whiteboard's scene",
    );
  });

  it("silently recovers a legacy empty scene", () => {
    renderWithProviders(<WhiteboardPage whiteboardId="whiteboard-1" />, {
      client: seededClient({}),
    });

    expect(screen.getByTestId("whiteboard-canvas")).toBeInTheDocument();
    expect(toastError).not.toHaveBeenCalled();
  });

  describe("debounced save", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("persists a scene change through useUpdateWhiteboardScene after ~400ms", () => {
      renderWithProviders(<WhiteboardPage whiteboardId="whiteboard-1" />, {
        client: seededClient(sceneToJson(emptyScene())),
      });

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));

      expect(updateSceneMutate).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(400);
      });

      expect(updateSceneMutate).toHaveBeenCalledTimes(1);
      const call = updateSceneMutate.mock.calls[0]?.[0] as {
        id: string;
        scene: WhiteboardScene;
      };
      expect(call.id).toBe("whiteboard-1");
      expect(call.scene.items).toHaveLength(1);
    });

    it("flushes the latest dirty scene when unmounted before the debounce expires", () => {
      const { unmount } = renderWithProviders(
        <WhiteboardPage whiteboardId="whiteboard-1" />,
        {
          client: seededClient(sceneToJson(emptyScene())),
        },
      );

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(updateSceneMutate).not.toHaveBeenCalled();

      unmount();

      expect(updateSceneMutate).toHaveBeenCalledTimes(1);
      expect(updateSceneMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "whiteboard-1",
          scene: expect.objectContaining({
            items: [expect.objectContaining({ type: "sticky" })],
          }),
        }),
        expect.objectContaining({ onSettled: expect.any(Function) }),
      );
    });

    it("saves the latest pending scene after an overlapping save settles", () => {
      renderWithProviders(<WhiteboardPage whiteboardId="whiteboard-1" />, {
        client: seededClient(sceneToJson(emptyScene())),
      });

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Add text" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      const firstOptions = updateSceneMutate.mock.calls[0]?.[1] as
        | { onSettled?: (data: unknown, error: Error | null) => void }
        | undefined;
      act(() => {
        firstOptions?.onSettled?.(undefined, null);
      });

      expect(updateSceneMutate).toHaveBeenCalledTimes(2);
      const latest = updateSceneMutate.mock.calls[1]?.[0] as {
        scene: WhiteboardScene;
      };
      expect(latest.scene.items).toHaveLength(2);
    });

    it("does not start a concurrent save on unmount while a save is in flight", () => {
      const { unmount } = renderWithProviders(
        <WhiteboardPage whiteboardId="whiteboard-1" />,
        {
          client: seededClient(sceneToJson(emptyScene())),
        },
      );

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Add text" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      unmount();
      // Must not race a second PATCH while the first is still in flight.
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      const firstOptions = updateSceneMutate.mock.calls[0]?.[1] as
        | { onSettled?: (data: unknown, error: Error | null) => void }
        | undefined;
      act(() => {
        firstOptions?.onSettled?.(undefined, null);
      });

      expect(updateSceneMutate).toHaveBeenCalledTimes(2);
      const latest = updateSceneMutate.mock.calls[1]?.[0] as {
        scene: WhiteboardScene;
      };
      expect(latest.scene.items).toHaveLength(2);
    });

    it("flushes a re-queued scene on unmount after a failed save", () => {
      const { unmount } = renderWithProviders(
        <WhiteboardPage whiteboardId="whiteboard-1" />,
        {
          client: seededClient(sceneToJson(emptyScene())),
        },
      );

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      const firstOptions = updateSceneMutate.mock.calls[0]?.[1] as
        | { onSettled?: (data: unknown, error: Error | null) => void }
        | undefined;
      act(() => {
        firstOptions?.onSettled?.(undefined, new Error("network"));
      });

      // Do not spin-retry while still mounted; keep the dirty scene queued.
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      unmount();

      expect(updateSceneMutate).toHaveBeenCalledTimes(2);
      const retry = updateSceneMutate.mock.calls[1]?.[0] as {
        scene: WhiteboardScene;
      };
      expect(retry.scene.items).toEqual([
        expect.objectContaining({ type: "sticky" }),
      ]);
    });

    it("retries once when an in-flight save fails after unmount", () => {
      const { unmount } = renderWithProviders(
        <WhiteboardPage whiteboardId="whiteboard-1" />,
        {
          client: seededClient(sceneToJson(emptyScene())),
        },
      );

      fireEvent.click(screen.getByRole("button", { name: "Add sticky note" }));
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      unmount();
      expect(updateSceneMutate).toHaveBeenCalledTimes(1);

      const firstOptions = updateSceneMutate.mock.calls[0]?.[1] as
        | { onSettled?: (data: unknown, error: Error | null) => void }
        | undefined;
      act(() => {
        firstOptions?.onSettled?.(undefined, new Error("network"));
      });

      expect(updateSceneMutate).toHaveBeenCalledTimes(2);

      const retryOptions = updateSceneMutate.mock.calls[1]?.[1] as
        | { onSettled?: (data: unknown, error: Error | null) => void }
        | undefined;
      act(() => {
        retryOptions?.onSettled?.(undefined, new Error("network"));
      });

      // Cap post-unmount retries so a hard failure does not spin forever.
      expect(updateSceneMutate).toHaveBeenCalledTimes(2);
    });
  });
});
