import { memo, useCallback, useEffect, useRef, useState } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type {
  StickyColor,
  WhiteboardItem,
  WhiteboardScene,
} from "@/lib/whiteboard-scene";

import { STICKY_COLOR_ORDER, stickyColorVar } from "./whiteboard-colors";
import { WhiteboardFrame } from "./whiteboard-frame";
import { WhiteboardSticky } from "./whiteboard-sticky";
import { WhiteboardText } from "./whiteboard-text";

type Camera = WhiteboardScene["camera"];

/** Props for the controlled whiteboard canvas. */
export interface WhiteboardCanvasProps {
  scene: WhiteboardScene;
  onMoveItems: (ids: string[], offset: { x: number; y: number }) => void;
  onResizeItem: (id: string, size: { w: number; h: number }) => void;
  onRemoveItems: (ids: string[]) => void;
  onSetItemText: (id: string, text: string) => void;
  onSetFrameTitle: (id: string, title: string) => void;
  onSetStickyColor: (id: string, color: StickyColor) => void;
  onSetZOrder: (id: string, z: number) => void;
  onCameraChange: (camera: Camera) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

const MIN_ITEM_SIZE = 40;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;

type Interaction =
  | {
      kind: "drag";
      ids: string[];
      startX: number;
      startY: number;
      moved: boolean;
    }
  | {
      kind: "resize";
      id: string;
      startX: number;
      startY: number;
      startW: number;
      startH: number;
      moved: boolean;
    }
  | {
      kind: "pan";
      startX: number;
      startY: number;
      startCam: Camera;
      moved: boolean;
    };

const clampZoom = (zoom: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

/**
 * The custom DOM canvas: a pan/zoom viewport that renders scene items as
 * absolutely-positioned elements. It owns transient interaction state
 * (selection, in-flight drag/resize/pan) and reports every structural change up
 * through the edit callbacks, which the page turns into undoable scene edits.
 */
export function WhiteboardCanvas(props: WhiteboardCanvasProps) {
  const { scene, onCameraChange } = props;
  const items = scene.items;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Transient previews applied during a gesture; committed once on pointer up.
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    w: number;
    h: number;
  } | null>(null);
  const [panCamera, setPanCamera] = useState<Camera | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const interaction = useRef<Interaction | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);

  // Latest values/callbacks held in refs so the window listeners bind once.
  const cameraRef = useRef(scene.camera);
  const itemsRef = useRef(items);
  const selectedRef = useRef(selectedIds);
  const editingRef = useRef(editingId);
  const propsRef = useRef(props);
  const spaceRef = useRef(false);
  useEffect(() => {
    cameraRef.current = scene.camera;
    itemsRef.current = items;
    selectedRef.current = selectedIds;
    editingRef.current = editingId;
    propsRef.current = props;
    spaceRef.current = spaceHeld;
  });

  const scheduleFrame = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const it = interaction.current;
      if (!it) return;
      const { x: cx, y: cy } = lastPointer.current;
      const zoom = cameraRef.current.zoom;
      if (it.kind === "drag") {
        setDragOffset({
          x: (cx - it.startX) / zoom,
          y: (cy - it.startY) / zoom,
        });
      } else if (it.kind === "resize") {
        setResizePreview({
          id: it.id,
          w: Math.max(MIN_ITEM_SIZE, it.startW + (cx - it.startX) / zoom),
          h: Math.max(MIN_ITEM_SIZE, it.startH + (cy - it.startY) / zoom),
        });
      } else {
        setPanCamera({
          x: it.startCam.x + (cx - it.startX),
          y: it.startCam.y + (cy - it.startY),
          zoom: it.startCam.zoom,
        });
      }
    });
  }, []);

  // Bind the window-level move/up/key listeners once; they read refs so a new
  // callback identity per render never re-binds them.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const it = interaction.current;
      if (!it) return;
      it.moved = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      scheduleFrame();
    };
    const onUp = (e: PointerEvent) => {
      const it = interaction.current;
      if (!it) return;
      interaction.current = null;
      if (frame.current) {
        cancelAnimationFrame(frame.current);
        frame.current = 0;
      }
      const zoom = cameraRef.current.zoom;
      const cx = e.clientX;
      const cy = e.clientY;
      if (it.kind === "drag") {
        setDragOffset(null);
        if (it.moved) {
          const dx = (cx - it.startX) / zoom;
          const dy = (cy - it.startY) / zoom;
          if (dx !== 0 || dy !== 0)
            propsRef.current.onMoveItems(it.ids, { x: dx, y: dy });
        }
      } else if (it.kind === "resize") {
        setResizePreview(null);
        if (it.moved) {
          propsRef.current.onResizeItem(it.id, {
            w: Math.max(MIN_ITEM_SIZE, it.startW + (cx - it.startX) / zoom),
            h: Math.max(MIN_ITEM_SIZE, it.startH + (cy - it.startY) / zoom),
          });
        }
      } else {
        setPanCamera(null);
        if (it.moved) {
          propsRef.current.onCameraChange({
            x: it.startCam.x + (cx - it.startX),
            y: it.startCam.y + (cy - it.startY),
            zoom: it.startCam.zoom,
          });
        }
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !isEditableTarget(e.target) && !editingRef.current) {
        spaceRef.current = true;
        setSpaceHeld(true);
        return;
      }
      if (isEditableTarget(e.target) || editingRef.current) return;
      const canvasHasFocus = rootRef.current?.contains(document.activeElement);
      if (!canvasHasFocus) return;
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) propsRef.current.onRedo?.();
        else propsRef.current.onUndo?.();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && key === "y") {
        e.preventDefault();
        propsRef.current.onRedo?.();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = selectedRef.current;
        if (ids.length === 0) return;
        e.preventDefault();
        propsRef.current.onRemoveItems(ids);
        setSelectedIds([]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spaceRef.current = false;
        setSpaceHeld(false);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [scheduleFrame]);

  const beginPan = useCallback((clientX: number, clientY: number) => {
    interaction.current = {
      kind: "pan",
      startX: clientX,
      startY: clientY,
      startCam: cameraRef.current,
      moved: false,
    };
  }, []);

  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      rootRef.current?.focus({ preventScroll: true });
      if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
        beginPan(e.clientX, e.clientY);
        return;
      }
      if (e.button !== 0) return;
      // Empty-canvas press clears the current selection and exits editing.
      setSelectedIds([]);
      setEditingId(null);
    },
    [beginPan],
  );

  const onItemPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    rootRef.current?.focus({ preventScroll: true });
    if (e.button !== 0) return;
    if (editingRef.current === id) return;

    const current = selectedRef.current;
    let next: string[];
    if (e.shiftKey) {
      next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
    } else {
      next = current.includes(id) ? current : [id];
    }
    setSelectedIds(next);
    selectedRef.current = next;
    if (editingRef.current && editingRef.current !== id) setEditingId(null);

    interaction.current = {
      kind: "drag",
      ids: next,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  }, []);

  const onResizeStart = useCallback(
    (e: React.PointerEvent, item: WhiteboardItem) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      interaction.current = {
        kind: "resize",
        id: item.id,
        startX: e.clientX,
        startY: e.clientY,
        startW: item.w,
        startH: item.h,
        moved: false,
      };
    },
    [],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cam = cameraRef.current;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const sceneX = (px - cam.x) / cam.zoom;
      const sceneY = (py - cam.y) / cam.zoom;
      const nextZoom = clampZoom(cam.zoom * Math.exp(-e.deltaY * 0.0015));
      onCameraChange({
        x: px - sceneX * nextZoom,
        y: py - sceneY * nextZoom,
        zoom: nextZoom,
      });
    },
    [onCameraChange],
  );

  const startEditing = useCallback((id: string) => {
    setSelectedIds([id]);
    setEditingId(id);
  }, []);

  const stopEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const bringToFront = useCallback((id: string) => {
    const maxZ = Math.max(0, ...itemsRef.current.map((i) => i.z));
    propsRef.current.onSetZOrder(id, maxZ + 1);
  }, []);

  const sendToBack = useCallback((id: string) => {
    const minZ = Math.min(0, ...itemsRef.current.map((i) => i.z));
    propsRef.current.onSetZOrder(id, minZ - 1);
  }, []);

  // Stable dispatchers that read the latest callbacks from the ref, so the
  // memoized item rows don't re-render just because the page passed a fresh
  // callback identity this render.
  const commitText = useCallback((id: string, text: string) => {
    propsRef.current.onSetItemText(id, text);
  }, []);
  const commitTitle = useCallback((id: string, title: string) => {
    propsRef.current.onSetFrameTitle(id, title);
  }, []);
  const setColor = useCallback((id: string, color: StickyColor) => {
    propsRef.current.onSetStickyColor(id, color);
  }, []);

  const cam = panCamera ?? scene.camera;
  const sorted = [...items].sort((a, b) => a.z - b.z);
  const onlySelected = selectedIds.length === 1 ? selectedIds[0] : null;

  return (
    /* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The canvas is a custom keyboard interaction surface: focus scopes delete and undo/redo shortcuts. */
    <div
      ref={rootRef}
      data-testid="whiteboard-canvas"
      role="application"
      tabIndex={0}
      aria-label="Whiteboard canvas"
      onPointerDown={onCanvasPointerDown}
      onWheel={onWheel}
      className="relative h-full w-full overflow-hidden"
      style={{
        background: "var(--wb-surface)",
        backgroundImage: "radial-gradient(var(--wb-dot) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        touchAction: "none",
        cursor: spaceHeld ? "grab" : "default",
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transformOrigin: "0 0",
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
        }}
      >
        {sorted.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <ItemView
              key={item.id}
              item={item}
              selected={selected}
              editing={editingId === item.id}
              showResize={onlySelected === item.id}
              dragOffset={selected ? dragOffset : null}
              resizePreview={
                resizePreview?.id === item.id ? resizePreview : null
              }
              onPointerDown={onItemPointerDown}
              onDoubleClick={startEditing}
              onStopEditing={stopEditing}
              onCommitText={commitText}
              onCommitTitle={commitTitle}
              onResizeStart={onResizeStart}
              onSetColor={setColor}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
            />
          );
        })}
      </div>
    </div>
    /* eslint-enable jsx-a11y/no-noninteractive-tabindex -- Re-enable after the custom canvas surface. */
  );
}

interface ItemViewProps {
  item: WhiteboardItem;
  selected: boolean;
  editing: boolean;
  showResize: boolean;
  dragOffset: { x: number; y: number } | null;
  resizePreview: { w: number; h: number } | null;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onDoubleClick: (id: string) => void;
  onStopEditing: () => void;
  onCommitText: (id: string, text: string) => void;
  onCommitTitle: (id: string, title: string) => void;
  onResizeStart: (e: React.PointerEvent, item: WhiteboardItem) => void;
  onSetColor: (id: string, color: StickyColor) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

const ItemView = memo(function ItemView({
  item,
  selected,
  editing,
  showResize,
  dragOffset,
  resizePreview,
  onPointerDown,
  onDoubleClick,
  onStopEditing,
  onCommitText,
  onCommitTitle,
  onResizeStart,
  onSetColor,
  onBringToFront,
  onSendToBack,
}: ItemViewProps) {
  const w = resizePreview?.w ?? item.w;
  const h = resizePreview?.h ?? item.h;

  let body: React.ReactNode;
  if (item.type === "sticky") {
    body = (
      <WhiteboardSticky
        item={item}
        editing={editing}
        onCommit={(text) => {
          onCommitText(item.id, text);
        }}
        onStopEditing={onStopEditing}
      />
    );
  } else if (item.type === "text") {
    body = (
      <WhiteboardText
        item={item}
        editing={editing}
        onCommit={(text) => {
          onCommitText(item.id, text);
        }}
        onStopEditing={onStopEditing}
      />
    );
  } else {
    body = (
      <WhiteboardFrame
        item={item}
        editing={editing}
        onCommit={(title) => {
          onCommitTitle(item.id, title);
        }}
        onStopEditing={onStopEditing}
      />
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Pointer-driven canvas object: selection/drag ride on pointer events, and keyboard delete/undo are handled at the canvas (window) level rather than per item. */}
        <div
          data-testid={`whiteboard-item-${item.id}`}
          data-item-type={item.type}
          onPointerDown={(e) => {
            onPointerDown(e, item.id);
          }}
          onDoubleClick={() => {
            onDoubleClick(item.id);
          }}
          className={cn(
            "absolute rounded-md",
            selected && "ring-2 ring-accent",
            editing ? "cursor-text" : "cursor-default",
          )}
          style={{
            left: `${item.x}px`,
            top: `${item.y}px`,
            width: `${w}px`,
            height: `${h}px`,
            zIndex: item.z,
            transform: dragOffset
              ? `translate(${dragOffset.x}px, ${dragOffset.y}px)`
              : undefined,
          }}
        >
          {body}
          {showResize && (
            <button
              type="button"
              aria-label="Resize item"
              onPointerDown={(e) => {
                onResizeStart(e, item);
              }}
              className="absolute -bottom-1 -right-1 h-3 w-3 rounded-sm border border-surface bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ cursor: "nwse-resize" }}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onSelect={() => {
            onBringToFront(item.id);
          }}
        >
          Bring to front
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            onSendToBack(item.id);
          }}
        >
          Send to back
        </ContextMenuItem>
        {item.type === "sticky" && (
          <>
            <ContextMenuSeparator />
            <div className="flex gap-1.5 px-2 py-1.5">
              {STICKY_COLOR_ORDER.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Sticky color ${color}`}
                  onClick={() => {
                    onSetColor(item.id, color);
                  }}
                  className="h-5 w-5 rounded-full border border-border outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: stickyColorVar(color) }}
                />
              ))}
            </div>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});
