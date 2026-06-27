import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 260;

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activeBookId: string | null;
  activeDocId: string | null;
  expandedFolderIds: string[];
  expandedDocIds: string[];
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveBook: (id: string | null) => void;
  setActiveDoc: (id: string | null) => void;
  toggleFolderExpanded: (id: string) => void;
  setFolderExpanded: (id: string, expanded: boolean) => void;
  toggleDocExpanded: (id: string) => void;
  setDocExpanded: (id: string, expanded: boolean) => void;
}

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      activeBookId: null,
      activeDocId: null,
      expandedFolderIds: [],
      expandedDocIds: [],
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: clampWidth(width) }),
      // Opening a different book always lands on its Title Page, never on a
      // stale document carried over from the previously open book.
      setActiveBook: (id) =>
        set((s) =>
          s.activeBookId === id
            ? { activeBookId: id }
            : { activeBookId: id, activeDocId: null },
        ),
      setActiveDoc: (id) => set({ activeDocId: id }),
      toggleFolderExpanded: (id) =>
        set((s) => ({
          expandedFolderIds: s.expandedFolderIds.includes(id)
            ? s.expandedFolderIds.filter((x) => x !== id)
            : [...s.expandedFolderIds, id],
        })),
      setFolderExpanded: (id, expanded) =>
        set((s) => ({
          expandedFolderIds: expanded
            ? s.expandedFolderIds.includes(id)
              ? s.expandedFolderIds
              : [...s.expandedFolderIds, id]
            : s.expandedFolderIds.filter((x) => x !== id),
        })),
      toggleDocExpanded: (id) =>
        set((s) => ({
          expandedDocIds: s.expandedDocIds.includes(id)
            ? s.expandedDocIds.filter((x) => x !== id)
            : [...s.expandedDocIds, id],
        })),
      setDocExpanded: (id, expanded) =>
        set((s) => ({
          expandedDocIds: expanded
            ? s.expandedDocIds.includes(id)
              ? s.expandedDocIds
              : [...s.expandedDocIds, id]
            : s.expandedDocIds.filter((x) => x !== id),
        })),
    }),
    {
      name: "scribe-ui",
      // Persist layout prefs + which folders/docs are open; selection is
      // per-session.
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarWidth: s.sidebarWidth,
        expandedFolderIds: s.expandedFolderIds,
        expandedDocIds: s.expandedDocIds,
      }),
    },
  ),
);
