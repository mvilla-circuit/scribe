import {
  Frame as FrameIcon,
  Redo2,
  StickyNote,
  Type,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { EditableText } from "@/components/book/editable-text";
import { NavHistoryControls } from "@/components/book/nav-history-controls";
import { Tooltip } from "@/components/ui/tooltip";
import {
  useRenameWhiteboard,
  useUpdateWhiteboardScene,
  useWhiteboards,
  useWhiteboardScene,
} from "@/data/whiteboards";
import { cn } from "@/lib/utils";
import {
  addItem,
  createUndoStack,
  isValidWhiteboardScene,
  moveItems,
  parseWhiteboardScene,
  removeItems,
  resizeItem,
  sceneToJson,
  setFrameTitle,
  setItemText,
  setStickyColor,
  setZOrder,
  type StickyColor,
  type WhiteboardItem,
  type WhiteboardScene,
} from "@/lib/whiteboard-scene";

import { WhiteboardCanvas } from "./whiteboard-canvas";

const SAVE_DELAY = 400;

function isTrivialEmptyScene(input: unknown): boolean {
  return (
    input == null ||
    input === "" ||
    (typeof input === "object" &&
      !Array.isArray(input) &&
      Object.keys(input).length === 0)
  );
}

/**
 * The whiteboard surface: resolves the board's metadata and scene, then mounts
 * the editor once the scene has loaded so its local state and undo history start
 * from real data. Renders a status message while loading / on error.
 */
export function WhiteboardPage({ whiteboardId }: { whiteboardId: string }) {
  const whiteboardsQuery = useWhiteboards();
  const sceneQuery = useWhiteboardScene(whiteboardId);
  const whiteboard =
    whiteboardsQuery.data?.find((item) => item.id === whiteboardId) ?? null;
  const corruptToastShown = useRef(false);

  useEffect(() => {
    const raw = sceneQuery.data;
    if (
      corruptToastShown.current ||
      raw === undefined ||
      isTrivialEmptyScene(raw) ||
      isValidWhiteboardScene(raw)
    ) {
      return;
    }
    corruptToastShown.current = true;
    toast.error("Couldn't read this whiteboard's scene");
  }, [sceneQuery.data]);

  const initialScene = useMemo(
    () =>
      sceneQuery.data !== undefined
        ? parseWhiteboardScene(sceneQuery.data)
        : null,
    [sceneQuery.data],
  );

  if (!initialScene) {
    const message = sceneQuery.isError
      ? "Couldn't load this whiteboard"
      : "Loading whiteboard…";
    return (
      <div data-testid="whiteboard-page" className="flex h-full flex-col bg-bg">
        <WhiteboardNav name={null} onRename={undefined} />
        <main className="flex flex-1 items-center justify-center px-8 pb-16">
          <p className="text-sm text-muted">{message}</p>
        </main>
      </div>
    );
  }

  return (
    <WhiteboardEditor
      key={whiteboardId}
      whiteboardId={whiteboardId}
      name={whiteboard?.name ?? "Untitled"}
      initialScene={initialScene}
    />
  );
}

function WhiteboardEditor({
  whiteboardId,
  name,
  initialScene,
}: {
  whiteboardId: string;
  name: string;
  initialScene: WhiteboardScene;
}) {
  const renameWhiteboard = useRenameWhiteboard();
  const updateScene = useUpdateWhiteboardScene();

  const [scene, setScene] = useState(initialScene);
  const sceneRef = useRef(initialScene);
  const undoStack = useRef(createUndoStack(initialScene));
  // Mirror the stack depth so the toolbar can disable no-op undo/redo without
  // the stack having to expose its internals.
  const [history, setHistory] = useState({ past: 0, future: 0 });

  const apply = useCallback((next: WhiteboardScene) => {
    undoStack.current.push(next);
    sceneRef.current = next;
    setScene(next);
    setHistory((h) => ({ past: h.past + 1, future: 0 }));
  }, []);

  // Camera changes are persisted but not undoable — nudging the viewport
  // shouldn't consume the undo history.
  const setCamera = useCallback((camera: WhiteboardScene["camera"]) => {
    const next = { ...sceneRef.current, camera };
    sceneRef.current = next;
    setScene(next);
  }, []);

  const undo = useCallback(() => {
    const next = undoStack.current.undo();
    sceneRef.current = next;
    setScene(next);
    setHistory((h) =>
      h.past > 0 ? { past: h.past - 1, future: h.future + 1 } : h,
    );
  }, []);

  const redo = useCallback(() => {
    const next = undoStack.current.redo();
    sceneRef.current = next;
    setScene(next);
    setHistory((h) =>
      h.future > 0 ? { past: h.past + 1, future: h.future - 1 } : h,
    );
  }, []);

  // Debounced persistence coalesces bursts before entering a single-flight
  // queue. While one PATCH is running, only the newest pending scene is kept.
  const { mutate: saveScene } = updateScene;
  const firstRun = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<WhiteboardScene | null>(null);
  const saveInFlight = useRef(false);
  const flushSaveRef = useRef<() => void>(() => undefined);
  const flushSave = useCallback(() => {
    if (saveInFlight.current || !pendingSave.current) return;
    const pending = pendingSave.current;
    pendingSave.current = null;
    saveInFlight.current = true;
    saveScene(
      { id: whiteboardId, scene: sceneToJson(pending) },
      {
        onSettled: () => {
          saveInFlight.current = false;
          flushSaveRef.current();
        },
      },
    );
  }, [saveScene, whiteboardId]);
  useEffect(() => {
    flushSaveRef.current = flushSave;
  }, [flushSave]);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    pendingSave.current = sceneRef.current;
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      flushSaveRef.current();
    }, SAVE_DELAY);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [scene]);

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const pending = pendingSave.current;
      if (!pending) return;
      pendingSave.current = null;
      saveScene({ id: whiteboardId, scene: sceneToJson(pending) });
    },
    [saveScene, whiteboardId],
  );

  const addAndSelect = useCallback(
    (make: (z: number) => WhiteboardItem) => {
      const cur = sceneRef.current;
      const topZ = Math.max(0, ...cur.items.map((i) => i.z));
      apply(addItem(cur, make(topZ + 1)));
    },
    [apply],
  );

  // Drop new items near the top-left of the current viewport so they land in
  // view regardless of how the camera has been panned/zoomed.
  const spawnPoint = useCallback(() => {
    const { camera } = sceneRef.current;
    const stagger = (sceneRef.current.items.length % 6) * 16;
    return {
      x: Math.round(-camera.x / camera.zoom) + 60 + stagger,
      y: Math.round(-camera.y / camera.zoom) + 60 + stagger,
    };
  }, []);

  const addSticky = useCallback(() => {
    const { x, y } = spawnPoint();
    addAndSelect((z) => ({
      id: crypto.randomUUID(),
      type: "sticky",
      x,
      y,
      w: 180,
      h: 180,
      z,
      text: "",
      color: "yellow",
    }));
  }, [addAndSelect, spawnPoint]);

  const addText = useCallback(() => {
    const { x, y } = spawnPoint();
    addAndSelect((z) => ({
      id: crypto.randomUUID(),
      type: "text",
      x,
      y,
      w: 220,
      h: 48,
      z,
      text: "",
    }));
  }, [addAndSelect, spawnPoint]);

  const addFrame = useCallback(() => {
    const { x, y } = spawnPoint();
    // Frames sit behind everything else, so they take a low z rather than the
    // next-on-top value the notes get.
    addAndSelect(() => ({
      id: crypto.randomUUID(),
      type: "frame",
      x,
      y,
      w: 420,
      h: 300,
      z: Math.min(0, ...sceneRef.current.items.map((i) => i.z)) - 1,
      title: "Frame",
    }));
  }, [addAndSelect, spawnPoint]);

  return (
    <div
      data-testid="whiteboard-page"
      className="flex h-full min-h-0 flex-col bg-bg"
    >
      <WhiteboardNav
        name={name}
        onRename={(value) => {
          renameWhiteboard.mutate({ id: whiteboardId, name: value });
        }}
      >
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton label="Add sticky note" onClick={addSticky}>
            <StickyNote className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label="Add text" onClick={addText}>
            <Type className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton label="Add frame" onClick={addFrame}>
            <FrameIcon className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <ToolbarButton
            label="Undo"
            onClick={undo}
            disabled={history.past === 0}
          >
            <Undo2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            onClick={redo}
            disabled={history.future === 0}
          >
            <Redo2 className="size-4" aria-hidden="true" />
          </ToolbarButton>
        </div>
      </WhiteboardNav>

      <main className="min-h-0 flex-1">
        <WhiteboardCanvas
          scene={scene}
          onMoveItems={(ids, offset) => {
            apply(moveItems(sceneRef.current, ids, offset));
          }}
          onResizeItem={(id, size) => {
            apply(resizeItem(sceneRef.current, id, size));
          }}
          onRemoveItems={(ids) => {
            apply(removeItems(sceneRef.current, ids));
          }}
          onSetItemText={(id, text) => {
            apply(setItemText(sceneRef.current, id, text));
          }}
          onSetFrameTitle={(id, title) => {
            apply(setFrameTitle(sceneRef.current, id, title));
          }}
          onSetStickyColor={(id, color: StickyColor) => {
            apply(setStickyColor(sceneRef.current, id, color));
          }}
          onSetZOrder={(id, z) => {
            apply(setZOrder(sceneRef.current, id, z));
          }}
          onCameraChange={setCamera}
          onUndo={undo}
          onRedo={redo}
        />
      </main>
    </div>
  );
}

function WhiteboardNav({
  name,
  onRename,
  children,
}: {
  name: string | null;
  onRename: ((value: string) => void) | undefined;
  children?: React.ReactNode;
}) {
  return (
    <nav
      aria-label="Whiteboard"
      data-tauri-drag-region
      className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-2"
    >
      <NavHistoryControls />
      {name !== null && onRename ? (
        <EditableText
          value={name}
          ariaLabel="Whiteboard name"
          placeholder="Untitled"
          onCommit={onRename}
          className="max-w-xs text-sm font-medium tracking-tight text-text"
        />
      ) : (
        <span className="text-sm font-medium text-muted">Whiteboard</span>
      )}
      {children}
    </nav>
  );
}

function ToolbarButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted outline-none",
          "transition-colors hover:bg-hover hover:text-text focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-40",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
