import { create } from "zustand";
import { persist } from "zustand/middleware";

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 420;
export const SIDEBAR_DEFAULT_WIDTH = 260;

type UIState = {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activeBookId: string | null;
  activeDocId: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveBook: (id: string | null) => void;
  setActiveDoc: (id: string | null) => void;
};

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      activeBookId: null,
      activeDocId: null,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) =>
        set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: clampWidth(width) }),
      setActiveBook: (id) => set({ activeBookId: id }),
      setActiveDoc: (id) => set({ activeDocId: id }),
    }),
    {
      name: "scribe-ui",
      // Only persist layout prefs; selection is per-session.
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarWidth: s.sidebarWidth,
      }),
    }
  )
);
