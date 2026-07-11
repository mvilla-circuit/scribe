import type { Json } from "@/lib/database.types";

/** Named colors available for sticky notes. */
export type StickyColor = "yellow" | "pink" | "blue" | "green" | "orange";

/**
 * Shared geometry and stacking fields for whiteboard items.
 * @lintignore Structural base for the item union; consumed via the concrete
 * item types (sticky/text/frame) rather than imported by name.
 */
export interface WhiteboardItemGeometry {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

/** A colored note on a whiteboard. */
export type WhiteboardStickyItem = WhiteboardItemGeometry & {
  type: "sticky";
  text: string;
  color: StickyColor;
};

/** A free-positioned text block on a whiteboard. */
export type WhiteboardTextItem = WhiteboardItemGeometry & {
  type: "text";
  text: string;
};

/** A visual region on a whiteboard. */
export type WhiteboardFrameItem = WhiteboardItemGeometry & {
  type: "frame";
  title: string;
};

/** An item that can be placed on a whiteboard. */
export type WhiteboardItem =
  WhiteboardStickyItem | WhiteboardTextItem | WhiteboardFrameItem;

/** The persisted document for a whiteboard. */
export interface WhiteboardScene {
  version: 1;
  camera: { x: number; y: number; zoom: number };
  items: WhiteboardItem[];
}

/** In-memory history controls for scene snapshots. */
export interface WhiteboardUndoStack {
  push: (scene: WhiteboardScene) => void;
  undo: () => WhiteboardScene;
  redo: () => WhiteboardScene;
}

const STICKY_COLORS = new Set<StickyColor>([
  "yellow",
  "pink",
  "blue",
  "green",
  "orange",
]);

/** Returns a fresh versioned scene with no items. */
export function emptyWhiteboardScene(): WhiteboardScene {
  return {
    version: 1,
    camera: { x: 0, y: 0, zoom: 1 },
    items: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasGeometry(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === "string" &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.w) &&
    isFiniteNumber(value.h) &&
    isFiniteNumber(value.z)
  );
}

function isStickyColor(value: unknown): value is StickyColor {
  return typeof value === "string" && STICKY_COLORS.has(value as StickyColor);
}

function isWhiteboardItem(value: unknown): value is WhiteboardItem {
  if (!isRecord(value) || !hasGeometry(value)) {
    return false;
  }

  if (value.type === "sticky") {
    return typeof value.text === "string" && isStickyColor(value.color);
  }

  if (value.type === "text") {
    return typeof value.text === "string";
  }

  return value.type === "frame" && typeof value.title === "string";
}

/** Returns whether an unknown value is a supported whiteboard scene. */
export function isValidWhiteboardScene(
  value: unknown,
): value is WhiteboardScene {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.camera)) {
    return false;
  }

  return (
    isFiniteNumber(value.camera.x) &&
    isFiniteNumber(value.camera.y) &&
    isFiniteNumber(value.camera.zoom) &&
    Array.isArray(value.items) &&
    value.items.every(isWhiteboardItem)
  );
}

/** Parses persisted scene data and falls back to a fresh empty scene. */
export function parseWhiteboardScene(input: unknown): WhiteboardScene {
  if (typeof input === "string") {
    if (input.trim() === "") {
      return emptyWhiteboardScene();
    }

    try {
      const parsed: unknown = JSON.parse(input);
      return isValidWhiteboardScene(parsed) ? parsed : emptyWhiteboardScene();
    } catch {
      return emptyWhiteboardScene();
    }
  }

  return isValidWhiteboardScene(input) ? input : emptyWhiteboardScene();
}

/** Returns a scene with an item appended, leaving the input scene unchanged. */
export function addItem(
  scene: WhiteboardScene,
  item: WhiteboardItem,
): WhiteboardScene {
  return { ...scene, items: [...scene.items, item] };
}

/** Moves matching items by a relative x/y offset. */
export function moveItems(
  scene: WhiteboardScene,
  ids: readonly string[],
  offset: { x: number; y: number },
): WhiteboardScene {
  const selectedIds = new Set(ids);
  return {
    ...scene,
    items: scene.items.map((item) =>
      selectedIds.has(item.id)
        ? { ...item, x: item.x + offset.x, y: item.y + offset.y }
        : item,
    ),
  };
}

/** Replaces the width and height of one item. */
export function resizeItem(
  scene: WhiteboardScene,
  id: string,
  size: { w: number; h: number },
): WhiteboardScene {
  return {
    ...scene,
    items: scene.items.map((item) =>
      item.id === id ? { ...item, ...size } : item,
    ),
  };
}

/** Changes the named color of one sticky note. */
export function setStickyColor(
  scene: WhiteboardScene,
  id: string,
  color: StickyColor,
): WhiteboardScene {
  return {
    ...scene,
    items: scene.items.map((item) =>
      item.id === id && item.type === "sticky" ? { ...item, color } : item,
    ),
  };
}

/** Sets the stacking order of one item. */
export function setZOrder(
  scene: WhiteboardScene,
  id: string,
  z: number,
): WhiteboardScene {
  return {
    ...scene,
    items: scene.items.map((item) => (item.id === id ? { ...item, z } : item)),
  };
}

/** Removes every item whose id is in the requested set. */
export function removeItems(
  scene: WhiteboardScene,
  ids: readonly string[],
): WhiteboardScene {
  const removedIds = new Set(ids);
  return {
    ...scene,
    items: scene.items.filter((item) => !removedIds.has(item.id)),
  };
}

/** Changes the content of one sticky note or free text item. */
export function setItemText(
  scene: WhiteboardScene,
  id: string,
  text: string,
): WhiteboardScene {
  return {
    ...scene,
    items: scene.items.map((item) =>
      item.id === id && item.type !== "frame" ? { ...item, text } : item,
    ),
  };
}

/** Changes the title of one frame. */
export function setFrameTitle(
  scene: WhiteboardScene,
  id: string,
  title: string,
): WhiteboardScene {
  return {
    ...scene,
    items: scene.items.map((item) =>
      item.id === id && item.type === "frame" ? { ...item, title } : item,
    ),
  };
}

/**
 * Serializes a scene to a plain JSON value for persistence. The scene is an
 * interface (no implicit index signature), so it isn't structurally assignable
 * to {@link Json}; a clone through JSON drops that nominal edge and yields a
 * value the data layer can store verbatim.
 */
export function sceneToJson(scene: WhiteboardScene): Json {
  return JSON.parse(JSON.stringify(scene)) as Json;
}

/** Creates an in-memory undo/redo history initialized with a scene snapshot. */
export function createUndoStack(
  initialScene: WhiteboardScene,
): WhiteboardUndoStack {
  const past: WhiteboardScene[] = [];
  let current = structuredClone(initialScene);
  let future: WhiteboardScene[] = [];

  return {
    push(scene) {
      past.push(current);
      current = structuredClone(scene);
      future = [];
    },
    undo() {
      const previous = past.pop();
      if (previous) {
        future.push(current);
        current = previous;
      }
      return structuredClone(current);
    },
    redo() {
      const next = future.pop();
      if (next) {
        past.push(current);
        current = next;
      }
      return structuredClone(current);
    },
  };
}
