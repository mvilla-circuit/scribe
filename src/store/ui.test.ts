import { beforeEach, describe, expect, it } from "vitest";

import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH, useUIStore } from "./ui";

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
