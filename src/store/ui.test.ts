import { beforeEach, describe, expect, it } from "vitest";

import {
  migrateUIState,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useUIStore,
} from "./ui";

const SIDEBAR_DEFAULT_WIDTH = 260;

const reset = () =>
  useUIStore.setState({
    sidebarCollapsed: false,
    sidebarWidth: 260,
    activeBookId: null,
    activeDocId: null,
    expandedFolderIds: [],
    expandedDocIds: [],
  });

beforeEach(reset);

describe("sidebar width", () => {
  it("clamps below the minimum and above the maximum", () => {
    const { setSidebarWidth } = useUIStore.getState();

    setSidebarWidth(10);
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);

    setSidebarWidth(9999);
    expect(useUIStore.getState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);

    setSidebarWidth(300);
    expect(useUIStore.getState().sidebarWidth).toBe(300);
  });

  it("toggles the collapsed flag", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});

describe("active book/doc selection", () => {
  it("clears the active doc when switching to a different book", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    useUIStore.getState().setActiveBook("b2");

    expect(useUIStore.getState().activeBookId).toBe("b2");
    expect(useUIStore.getState().activeDocId).toBeNull();
  });

  it("keeps the active doc when re-selecting the same book", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    useUIStore.getState().setActiveBook("b1");

    expect(useUIStore.getState().activeDocId).toBe("d1");
  });
});

describe("expanded folder/doc sets", () => {
  it("toggles a folder id on and off", () => {
    const { toggleFolderExpanded } = useUIStore.getState();
    toggleFolderExpanded("f1");
    expect(useUIStore.getState().expandedFolderIds).toEqual(["f1"]);
    toggleFolderExpanded("f1");
    expect(useUIStore.getState().expandedFolderIds).toEqual([]);
  });

  it("setFolderExpanded is idempotent and does not duplicate ids", () => {
    const { setFolderExpanded } = useUIStore.getState();
    setFolderExpanded("f1", true);
    setFolderExpanded("f1", true);
    expect(useUIStore.getState().expandedFolderIds).toEqual(["f1"]);
    setFolderExpanded("f1", false);
    expect(useUIStore.getState().expandedFolderIds).toEqual([]);
  });

  it("toggles doc expansion independently", () => {
    const { toggleDocExpanded } = useUIStore.getState();
    toggleDocExpanded("d1");
    toggleDocExpanded("d2");
    expect(useUIStore.getState().expandedDocIds).toEqual(["d1", "d2"]);
    toggleDocExpanded("d1");
    expect(useUIStore.getState().expandedDocIds).toEqual(["d2"]);
  });
});

describe("migrateUIState", () => {
  it("passes a well-formed persisted blob through unchanged", () => {
    const blob = {
      sidebarCollapsed: true,
      sidebarWidth: 300,
      expandedFolderIds: ["f1", "f2"],
      expandedDocIds: ["d1"],
    };
    expect(migrateUIState(blob)).toEqual(blob);
  });

  it("sanitizes wrong-typed fields back to valid values", () => {
    const result = migrateUIState({
      // sidebarCollapsed missing entirely
      sidebarWidth: "300",
      expandedFolderIds: ["f1", 2, null, "f2"],
      expandedDocIds: [null, 7],
    });
    expect(result).toEqual({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      expandedFolderIds: ["f1", "f2"],
      expandedDocIds: [],
    });
  });

  it("clamps an out-of-range sidebar width", () => {
    expect(migrateUIState({ sidebarWidth: 10 }).sidebarWidth).toBe(
      SIDEBAR_MIN_WIDTH,
    );
    expect(migrateUIState({ sidebarWidth: 9999 }).sidebarWidth).toBe(
      SIDEBAR_MAX_WIDTH,
    );
    expect(migrateUIState({ sidebarWidth: Infinity }).sidebarWidth).toBe(
      SIDEBAR_DEFAULT_WIDTH,
    );
  });

  it("returns safe defaults for junk input", () => {
    const defaults = {
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      expandedFolderIds: [],
      expandedDocIds: [],
    };
    expect(migrateUIState(null)).toEqual(defaults);
    expect(migrateUIState(42)).toEqual(defaults);
    expect(migrateUIState("x")).toEqual(defaults);
    expect(migrateUIState([])).toEqual(defaults);
  });
});

describe("persist hydration", () => {
  it("runs the sanitizer on rehydrate so a corrupted payload can't crash consumers", async () => {
    // A version-matching but corrupted blob: `migrate` wouldn't fire (versions
    // match), so without a sanitizing `merge` these bad values would load
    // verbatim and `toggleFolderExpanded` would throw on `arr.includes`.
    localStorage.setItem(
      "scribe-ui",
      JSON.stringify({
        state: {
          sidebarCollapsed: "yes",
          sidebarWidth: "wide",
          expandedFolderIds: "not-an-array",
          expandedDocIds: null,
        },
        version: 1,
      }),
    );

    await useUIStore.persist.rehydrate();

    const state = useUIStore.getState();
    expect(Array.isArray(state.expandedFolderIds)).toBe(true);
    expect(Array.isArray(state.expandedDocIds)).toBe(true);
    expect(typeof state.sidebarWidth).toBe("number");
    expect(state.sidebarCollapsed).toBe(false);
    expect(() => {
      state.toggleFolderExpanded("f1");
    }).not.toThrow();

    localStorage.clear();
  });
});
