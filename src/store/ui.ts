import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

/** Smallest allowed sidebar width, in px; widths are clamped to this floor. */
export const SIDEBAR_MIN_WIDTH = 200;
/** Largest allowed sidebar width, in px; widths are clamped to this ceiling. */
export const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 260;

// A single visited page in the navigation history — the book being read and the
// document within it (or `null` for the book's Title Page / no active book).
interface HistoryEntry {
  bookId: string | null;
  docId: string | null;
}

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activeBookId: string | null;
  activeDocId: string | null;
  expandedFolderIds: string[];
  expandedDocIds: string[];
  history: HistoryEntry[];
  historyIndex: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveBook: (id: string | null) => void;
  setActiveDoc: (id: string | null) => void;
  navigateTo: (entry: HistoryEntry) => void;
  goBack: () => void;
  goForward: () => void;
  toggleFolderExpanded: (id: string) => void;
  setFolderExpanded: (id: string, expanded: boolean) => void;
  toggleDocExpanded: (id: string) => void;
  setDocExpanded: (id: string, expanded: boolean) => void;
}

const clampWidth = (width: number) =>
  Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width));

// Add `id` if absent, otherwise remove it — the "toggle membership" idiom shared
// by both expansion sets.
const toggleIn = (arr: string[], id: string): string[] =>
  arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];

// Force `id` present (`on`) or absent, idempotently — the "set membership" idiom
// shared by both expansion sets.
const setIn = (arr: string[], id: string, on: boolean): string[] =>
  on ? (arr.includes(id) ? arr : [...arr, id]) : arr.filter((x) => x !== id);

// Append the freshly-visited `(bookId, docId)` location to the navigation
// history, returning the updated `history`/`historyIndex` slice. Consecutive
// duplicates of the current entry are dropped (re-selecting the same page is not
// a navigation), and any forward entries are truncated — landing somewhere new
// after going back abandons the old forward trail, exactly like a browser.
const recordLocation = (
  state: Pick<UIState, "history" | "historyIndex">,
  bookId: string | null,
  docId: string | null,
): Pick<UIState, "history" | "historyIndex"> => {
  const current = state.history[state.historyIndex];
  if (current?.bookId === bookId && current?.docId === docId) {
    return { history: state.history, historyIndex: state.historyIndex };
  }
  const history = [
    ...state.history.slice(0, state.historyIndex + 1),
    { bookId, docId },
  ];
  return { history, historyIndex: history.length - 1 };
};

// The slice of UIState persisted under `scribe-ui` (see `partialize` below).
interface PersistedUIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  expandedFolderIds: string[];
  expandedDocIds: string[];
}

const PERSISTED_DEFAULTS: PersistedUIState = {
  sidebarCollapsed: false,
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  expandedFolderIds: [],
  expandedDocIds: [],
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

/**
 * Coerces an unknown persisted blob into a valid {@link PersistedUIState} so a
 * corrupted or out-of-date payload can never crash hydration. Wrongly-typed or
 * missing fields fall back to the store defaults; the sidebar width is clamped.
 */
export function migrateUIState(state: unknown): PersistedUIState {
  if (typeof state !== "object" || state === null) {
    return { ...PERSISTED_DEFAULTS };
  }
  const raw = state as Record<string, unknown>;
  const width = raw.sidebarWidth;
  return {
    sidebarCollapsed:
      typeof raw.sidebarCollapsed === "boolean"
        ? raw.sidebarCollapsed
        : PERSISTED_DEFAULTS.sidebarCollapsed,
    sidebarWidth:
      typeof width === "number" && Number.isFinite(width)
        ? clampWidth(width)
        : PERSISTED_DEFAULTS.sidebarWidth,
    expandedFolderIds: toStringArray(raw.expandedFolderIds),
    expandedDocIds: toStringArray(raw.expandedDocIds),
  };
}

// `persist` fires `setItem` on *every* store change, including per-session
// selection (`activeBookId`/`activeDocId`), which `partialize` deliberately
// drops. Re-serializing and writing the same layout/expansion JSON back to
// localStorage on each page navigation is wasted work on a hot path, so this
// wrapper skips writes whose payload matches what was last written for the key.
const lastWritten = new Map<string, string>();
// `zustand/persist` already routes hydration through its own try/catch (a
// throwing/parse-failing `getItem` is reported to `onRehydrateStorage`, not
// thrown), but these are hand-rolled `localStorage` touches, so guard them
// directly: a private-mode/disabled-storage throw still can't crash startup.
const dedupedStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (lastWritten.get(name) === value) return;
    try {
      localStorage.setItem(name, value);
    } catch (err) {
      // A failed write (quota / disabled storage) is non-fatal; skip caching
      // so a later change still attempts the write.
      console.warn("Failed to persist UI state", err);
      return;
    }
    lastWritten.set(name, value);
  },
  removeItem: (name) => {
    lastWritten.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {
      // Best-effort removal; nothing to recover if it fails.
    }
  },
};

/**
 * Global UI state store: sidebar layout, the active book/document selection, and
 * which folders/docs are expanded. Layout and expansion are persisted to
 * `localStorage` under `scribe-ui`; the active selection is per-session.
 */
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
      activeBookId: null,
      activeDocId: null,
      expandedFolderIds: [],
      expandedDocIds: [],
      history: [],
      historyIndex: -1,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: clampWidth(width) }),
      // Opening a different book always lands on its Title Page, never on a
      // stale document carried over from the previously open book. The resulting
      // location is recorded in the navigation history.
      setActiveBook: (id) =>
        set((s) => {
          const docId = s.activeBookId === id ? s.activeDocId : null;
          return {
            activeBookId: id,
            activeDocId: docId,
            ...recordLocation(s, id, docId),
          };
        }),
      setActiveDoc: (id) =>
        set((s) => ({
          activeDocId: id,
          ...recordLocation(s, s.activeBookId, id),
        })),
      // Set both the book and document in one step, recording a single history
      // entry — used by cross-book navigation (e.g. editor page links) that would
      // otherwise record a spurious intermediate Title Page location.
      navigateTo: ({ bookId, docId }) =>
        set((s) => ({
          activeBookId: bookId,
          activeDocId: docId,
          ...recordLocation(s, bookId, docId),
        })),
      // Restore the previous/next visited location without recording a new
      // entry, so the history trail is preserved as the cursor moves along it.
      goBack: () =>
        set((s) => {
          const index = s.historyIndex - 1;
          const entry = s.history[index];
          if (!entry) return {};
          return {
            historyIndex: index,
            activeBookId: entry.bookId,
            activeDocId: entry.docId,
          };
        }),
      goForward: () =>
        set((s) => {
          const index = s.historyIndex + 1;
          const entry = s.history[index];
          if (!entry) return {};
          return {
            historyIndex: index,
            activeBookId: entry.bookId,
            activeDocId: entry.docId,
          };
        }),
      toggleFolderExpanded: (id) =>
        set((s) => ({ expandedFolderIds: toggleIn(s.expandedFolderIds, id) })),
      setFolderExpanded: (id, expanded) =>
        set((s) => ({
          expandedFolderIds: setIn(s.expandedFolderIds, id, expanded),
        })),
      toggleDocExpanded: (id) =>
        set((s) => ({ expandedDocIds: toggleIn(s.expandedDocIds, id) })),
      setDocExpanded: (id, expanded) =>
        set((s) => ({
          expandedDocIds: setIn(s.expandedDocIds, id, expanded),
        })),
    }),
    {
      name: "scribe-ui",
      version: 1,
      storage: createJSONStorage(() => dedupedStorage),
      // Persist layout prefs + which folders/docs are open; selection is
      // per-session.
      partialize: (s): PersistedUIState => ({
        sidebarCollapsed: s.sidebarCollapsed,
        sidebarWidth: s.sidebarWidth,
        expandedFolderIds: s.expandedFolderIds,
        expandedDocIds: s.expandedDocIds,
      }),
      // Defensively sanitize the persisted blob on *every* hydrate, not just on
      // a version bump: `persist` only calls `migrate` when the stored version
      // differs, so the coercion has to live in `merge` to actually run on a
      // normal load. Without this a corrupted or tampered payload (e.g. a
      // non-array `expandedFolderIds`) would reach consumers like `toggleIn` and
      // crash on `arr.includes`.
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...migrateUIState(persistedState),
      }),
    },
  ),
);
