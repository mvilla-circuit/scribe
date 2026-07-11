import { describe, expect, it } from "vitest";

import {
  addItem,
  createUndoStack,
  emptyWhiteboardScene,
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
  type WhiteboardScene,
} from "./whiteboard-scene";

const DEFAULT_SCENE = {
  version: 1,
  camera: { x: 0, y: 0, zoom: 1 },
  items: [],
};

const SCENE: WhiteboardScene = {
  version: 1,
  camera: { x: 0, y: 0, zoom: 1 },
  items: [
    {
      id: "sticky-1",
      type: "sticky",
      x: 10,
      y: 20,
      w: 200,
      h: 160,
      z: 1,
      text: "Sticky",
      color: "yellow",
    },
    {
      id: "text-1",
      type: "text",
      x: 30,
      y: 40,
      w: 240,
      h: 80,
      z: 2,
      text: "Text",
    },
    {
      id: "frame-1",
      type: "frame",
      x: 0,
      y: 0,
      w: 640,
      h: 480,
      z: 0,
      title: "Frame",
    },
  ],
};

describe("emptyWhiteboardScene", () => {
  it("returns a versioned empty scene", () => {
    expect(emptyWhiteboardScene()).toEqual(DEFAULT_SCENE);
  });
});

describe("isValidWhiteboardScene", () => {
  it("distinguishes valid scenes from corrupt data", () => {
    expect(isValidWhiteboardScene(DEFAULT_SCENE)).toBe(true);
    expect(isValidWhiteboardScene({ version: 1, items: [] })).toBe(false);
    expect(isValidWhiteboardScene("not json")).toBe(false);
  });
});

describe("parseWhiteboardScene", () => {
  it.each([undefined, null, "", "not json", {}, { version: 2 }])(
    "returns the default scene for invalid input %#",
    (input) => {
      expect(parseWhiteboardScene(input)).toEqual(DEFAULT_SCENE);
    },
  );

  it("parses a valid scene", () => {
    const scene = {
      version: 1,
      camera: { x: 12, y: -4, zoom: 1.5 },
      items: [
        {
          id: "sticky-1",
          type: "sticky",
          x: 10,
          y: 20,
          w: 200,
          h: 160,
          z: 1,
          text: "Remember this",
          color: "yellow",
        },
      ],
    };

    expect(parseWhiteboardScene(JSON.stringify(scene))).toEqual(scene);
  });
});

describe("whiteboard scene helpers", () => {
  it.each([
    {
      id: "sticky-2",
      type: "sticky" as const,
      x: 50,
      y: 60,
      w: 180,
      h: 140,
      z: 3,
      text: "New sticky",
      color: "pink" as const,
    },
    {
      id: "text-2",
      type: "text" as const,
      x: 70,
      y: 80,
      w: 220,
      h: 60,
      z: 4,
      text: "New text",
    },
    {
      id: "frame-2",
      type: "frame" as const,
      x: 90,
      y: 100,
      w: 500,
      h: 360,
      z: 5,
      title: "New frame",
    },
  ])("addItem inserts a $type with its id and geometry", (item) => {
    const result = addItem(SCENE, item);

    expect(result.items.at(-1)).toEqual(item);
    expect(SCENE.items).toHaveLength(3);
  });

  it("moveItems updates x and y for the requested ids", () => {
    const result = moveItems(SCENE, ["sticky-1", "text-1"], {
      x: 5,
      y: -10,
    });

    expect(result.items[0]).toMatchObject({ x: 15, y: 10 });
    expect(result.items[1]).toMatchObject({ x: 35, y: 30 });
    expect(result.items[2]).toBe(SCENE.items[2]);
    expect(SCENE.items[0]).toMatchObject({ x: 10, y: 20 });
  });

  it("resizeItem updates width and height", () => {
    const result = resizeItem(SCENE, "sticky-1", { w: 240, h: 180 });

    expect(result.items[0]).toMatchObject({ w: 240, h: 180 });
  });

  it("setStickyColor updates a sticky note color", () => {
    const result = setStickyColor(SCENE, "sticky-1", "blue");

    expect(result.items[0]).toMatchObject({ color: "blue" });
  });

  it("setZOrder updates an item's z value", () => {
    const result = setZOrder(SCENE, "frame-1", 6);

    expect(result.items[2]).toMatchObject({ z: 6 });
  });

  it("removeItems deletes items with requested ids", () => {
    const result = removeItems(SCENE, ["sticky-1", "frame-1"]);

    expect(result.items.map((item) => item.id)).toEqual(["text-1"]);
  });

  it("setItemText updates sticky and text content", () => {
    const stickyResult = setItemText(SCENE, "sticky-1", "Updated sticky");
    const textResult = setItemText(stickyResult, "text-1", "Updated text");

    expect(textResult.items[0]).toMatchObject({ text: "Updated sticky" });
    expect(textResult.items[1]).toMatchObject({ text: "Updated text" });
  });

  it("setFrameTitle updates a frame title", () => {
    const result = setFrameTitle(SCENE, "frame-1", "Updated frame");

    expect(result.items[2]).toMatchObject({ title: "Updated frame" });
  });
});

describe("sceneToJson", () => {
  it("clones a scene into a plain JSON value", () => {
    const json = sceneToJson(SCENE);

    expect(json).toEqual(SCENE);
    expect(json).not.toBe(SCENE);
  });
});

describe("createUndoStack", () => {
  it("undo restores the previous scene snapshot", () => {
    const history = createUndoStack(SCENE);
    const movedScene = moveItems(SCENE, ["sticky-1"], { x: 25, y: 15 });

    history.push(movedScene);

    expect(history.undo()).toEqual(SCENE);
  });

  it("redo restores an undone scene snapshot", () => {
    const history = createUndoStack(SCENE);
    const movedScene = moveItems(SCENE, ["sticky-1"], { x: 25, y: 15 });
    history.push(movedScene);
    history.undo();

    expect(history.redo()).toEqual(movedScene);
  });
});
