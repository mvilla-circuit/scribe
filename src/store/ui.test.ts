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
    activeCollectionId: null,
    activeEntryId: null,
    activeDatagridId: null,
    activeDatagridRowId: null,
    rowOpenMode: "modal",
    rowOpenModeByDatagridId: {},
    expandedFolderIds: [],
    expandedDocIds: [],
    history: [],
    historyIndex: -1,
  });

// A full history location with only the given axes set, matching the store's
// HistoryEntry shape so assertions stay concise.
const loc = (over: {
  bookId?: string | null;
  docId?: string | null;
  collectionId?: string | null;
  entryId?: string | null;
  datagridId?: string | null;
  rowId?: string | null;
}) => ({
  bookId: null,
  docId: null,
  collectionId: null,
  entryId: null,
  datagridId: null,
  rowId: null,
  ...over,
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

describe("navigation history", () => {
  it("records visited locations and steps back and forward", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");
    store.setActiveDoc("d2");

    // At the end of history: forward is exhausted, back is available.
    expect(useUIStore.getState().historyIndex).toBe(2);
    expect(useUIStore.getState().activeDocId).toBe("d2");

    useUIStore.getState().goBack();
    expect(useUIStore.getState().activeBookId).toBe("b1");
    expect(useUIStore.getState().activeDocId).toBe("d1");

    useUIStore.getState().goBack();
    expect(useUIStore.getState().activeBookId).toBe("b1");
    expect(useUIStore.getState().activeDocId).toBeNull();

    useUIStore.getState().goForward();
    expect(useUIStore.getState().activeDocId).toBe("d1");

    useUIStore.getState().goForward();
    expect(useUIStore.getState().activeDocId).toBe("d2");
  });

  it("does not record duplicate consecutive locations", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");
    // Re-selecting the same book keeps the doc — no location change, no entry.
    useUIStore.getState().setActiveBook("b1");
    // Re-selecting the same doc is likewise a no-op for history.
    useUIStore.getState().setActiveDoc("d1");

    expect(useUIStore.getState().history).toEqual([
      loc({ bookId: "b1" }),
      loc({ bookId: "b1", docId: "d1" }),
    ]);
    expect(useUIStore.getState().historyIndex).toBe(1);
  });

  it("truncates forward history after a new navigation", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");
    store.setActiveDoc("d2");

    useUIStore.getState().goBack();
    expect(useUIStore.getState().activeDocId).toBe("d1");

    // Navigating from the middle drops the stale forward entry (d2).
    useUIStore.getState().setActiveDoc("d3");
    expect(useUIStore.getState().historyIndex).toBe(2);
    expect(useUIStore.getState().history).toEqual([
      loc({ bookId: "b1" }),
      loc({ bookId: "b1", docId: "d1" }),
      loc({ bookId: "b1", docId: "d3" }),
    ]);

    // Forward is now exhausted.
    useUIStore.getState().goForward();
    expect(useUIStore.getState().activeDocId).toBe("d3");
  });

  it("navigateTo records a single combined entry", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    useUIStore.getState().navigateTo({ bookId: "b2", docId: "d9" });

    expect(useUIStore.getState().activeBookId).toBe("b2");
    expect(useUIStore.getState().activeDocId).toBe("d9");
    expect(useUIStore.getState().history).toEqual([
      loc({ bookId: "b1" }),
      loc({ bookId: "b1", docId: "d1" }),
      loc({ bookId: "b2", docId: "d9" }),
    ]);
  });

  it("goBack and goForward clamp at the ends", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    // Forward at the end is a no-op.
    useUIStore.getState().goForward();
    expect(useUIStore.getState().activeDocId).toBe("d1");
    expect(useUIStore.getState().historyIndex).toBe(1);

    useUIStore.getState().goBack();
    // Back at the start is a no-op.
    useUIStore.getState().goBack();
    useUIStore.getState().goBack();
    expect(useUIStore.getState().historyIndex).toBe(0);
    expect(useUIStore.getState().activeBookId).toBe("b1");
    expect(useUIStore.getState().activeDocId).toBeNull();
  });
});

describe("active collection/entry selection", () => {
  it("switching to a collection clears the active book and doc", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    useUIStore.getState().setActiveCollection("c1");

    const state = useUIStore.getState();
    expect(state.activeCollectionId).toBe("c1");
    expect(state.activeEntryId).toBeNull();
    expect(state.activeBookId).toBeNull();
    expect(state.activeDocId).toBeNull();
  });

  it("clears the active entry when switching to a different collection", () => {
    const store = useUIStore.getState();
    store.setActiveCollection("c1");
    store.setActiveEntry("e1", "c1");

    useUIStore.getState().setActiveCollection("c2");

    expect(useUIStore.getState().activeEntryId).toBeNull();
    expect(useUIStore.getState().activeCollectionId).toBe("c2");
  });

  it("keeps the active entry when re-selecting the same collection", () => {
    const store = useUIStore.getState();
    store.setActiveCollection("c1");
    store.setActiveEntry("e1", "c1");

    useUIStore.getState().setActiveCollection("c1");

    expect(useUIStore.getState().activeEntryId).toBe("e1");
  });

  it("selecting an entry records its collection and clears the book axis", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");

    useUIStore.getState().setActiveEntry("e1", "c1");

    const state = useUIStore.getState();
    expect(state.activeCollectionId).toBe("c1");
    expect(state.activeEntryId).toBe("e1");
    expect(state.activeBookId).toBeNull();
    expect(state.activeDocId).toBeNull();
  });

  it("records collection/entry locations and steps back across surfaces", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveCollection("c1");
    store.setActiveEntry("e1", "c1");

    expect(useUIStore.getState().history).toEqual([
      loc({ bookId: "b1" }),
      loc({ collectionId: "c1" }),
      loc({ collectionId: "c1", entryId: "e1" }),
    ]);

    // Stepping back returns to the book surface, clearing the collection axis.
    useUIStore.getState().goBack();
    useUIStore.getState().goBack();
    const state = useUIStore.getState();
    expect(state.activeBookId).toBe("b1");
    expect(state.activeCollectionId).toBeNull();
    expect(state.activeEntryId).toBeNull();
  });

  it("does not persist the active collection/entry selection", () => {
    useUIStore.getState().setActiveCollection("c1");
    useUIStore.getState().setActiveEntry("e1", "c1");

    const partialize = useUIStore.persist.getOptions().partialize;
    const persisted = partialize?.(useUIStore.getState());
    expect(persisted).not.toHaveProperty("activeCollectionId");
    expect(persisted).not.toHaveProperty("activeEntryId");
  });
});

describe("active datagrid/row selection", () => {
  it("opening a datagrid clears the other surface axes", () => {
    const store = useUIStore.getState();
    store.setActiveBook("b1");
    store.setActiveDoc("d1");
    store.setActiveCollection("c1");

    useUIStore.getState().setActiveDatagrid("dg1");

    const state = useUIStore.getState();
    expect(state.activeDatagridId).toBe("dg1");
    expect(state.activeDatagridRowId).toBeNull();
    expect(state.activeBookId).toBeNull();
    expect(state.activeDocId).toBeNull();
    expect(state.activeCollectionId).toBeNull();
    expect(state.activeEntryId).toBeNull();
  });

  it("clears the active row when switching to a different datagrid", () => {
    const store = useUIStore.getState();
    store.setActiveDatagrid("dg1");
    store.setActiveDatagridRow("r1", "dg1");

    useUIStore.getState().setActiveDatagrid("dg2");

    expect(useUIStore.getState().activeDatagridRowId).toBeNull();
    expect(useUIStore.getState().activeDatagridId).toBe("dg2");
  });

  it("keeps the active row when re-selecting the same datagrid", () => {
    const store = useUIStore.getState();
    store.setActiveDatagrid("dg1");
    store.setActiveDatagridRow("r1", "dg1");

    useUIStore.getState().setActiveDatagrid("dg1");

    expect(useUIStore.getState().activeDatagridRowId).toBe("r1");
  });

  it("selecting a row records its datagrid and clears other surfaces", () => {
    const store = useUIStore.getState();
    store.setActiveCollection("c1");

    useUIStore.getState().setActiveDatagridRow("r1", "dg1");

    const state = useUIStore.getState();
    expect(state.activeDatagridId).toBe("dg1");
    expect(state.activeDatagridRowId).toBe("r1");
    expect(state.activeCollectionId).toBeNull();
  });

  it("records datagrid/row locations and steps back and forward", () => {
    const store = useUIStore.getState();
    store.setActiveDatagrid("dg1");
    store.setActiveDatagridRow("r1", "dg1");

    expect(useUIStore.getState().history).toEqual([
      loc({ datagridId: "dg1" }),
      loc({ datagridId: "dg1", rowId: "r1" }),
    ]);

    useUIStore.getState().goBack();
    expect(useUIStore.getState().activeDatagridId).toBe("dg1");
    expect(useUIStore.getState().activeDatagridRowId).toBeNull();

    useUIStore.getState().goForward();
    expect(useUIStore.getState().activeDatagridRowId).toBe("r1");
  });

  it("navigateTo includes the datagrid/row axes", () => {
    useUIStore.getState().navigateTo({ datagridId: "dg9", rowId: "r9" });

    const state = useUIStore.getState();
    expect(state.activeDatagridId).toBe("dg9");
    expect(state.activeDatagridRowId).toBe("r9");
  });

  it("does not persist the datagrid selection or row-open mode", () => {
    useUIStore.getState().setActiveDatagrid("dg1");
    useUIStore.getState().setRowOpenMode("split");

    const partialize = useUIStore.persist.getOptions().partialize;
    const persisted = partialize?.(useUIStore.getState());
    expect(persisted).not.toHaveProperty("activeDatagridId");
    expect(persisted).not.toHaveProperty("activeDatagridRowId");
    expect(persisted).not.toHaveProperty("rowOpenMode");
    expect(persisted).not.toHaveProperty("rowOpenModeByDatagridId");
  });
});

describe("row-open mode", () => {
  it("defaults to modal", () => {
    expect(useUIStore.getState().rowOpenMode).toBe("modal");
  });

  it("setRowOpenMode updates the current mode", () => {
    useUIStore.getState().setRowOpenMode("full");
    expect(useUIStore.getState().rowOpenMode).toBe("full");
  });

  it("remembers the open mode per active datagrid and restores it on reopen", () => {
    const store = useUIStore.getState();
    store.setActiveDatagrid("dg1");
    store.setRowOpenMode("split");

    expect(useUIStore.getState().rowOpenModeByDatagridId).toEqual({
      dg1: "split",
    });

    // Switching to another datagrid does not carry the remembered mode over.
    useUIStore.getState().setActiveDatagrid("dg2");
    useUIStore.getState().setRowOpenMode("full");

    // Returning to dg1 restores its remembered "split" mode.
    useUIStore.getState().setActiveDatagrid("dg1");
    expect(useUIStore.getState().rowOpenMode).toBe("split");
  });

  it("does not record the open mode in the map when no datagrid is active", () => {
    useUIStore.getState().setRowOpenMode("full");
    expect(useUIStore.getState().rowOpenModeByDatagridId).toEqual({});
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
