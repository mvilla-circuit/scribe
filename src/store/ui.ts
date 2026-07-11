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

/**
 * How a datagrid row opens over its grid: as a centered modal, a side split
 * pane, or a full-window surface. Persisted per-datagrid in an ephemeral map.
 */
export type RowOpenMode = "modal" | "split" | "full";

// A single visited location in the navigation history. The app shows exactly one
// of three surfaces: a book's document (`bookId`/`docId`), a collection's entry
// (`collectionId`/`entryId`), or a datagrid's row (`datagridId`/`rowId`). Unused
// axes are `null`; an all-`null` entry is the library home. Keeping every axis
// in one entry lets the browser-style history step across the surfaces
// uniformly.
interface HistoryEntry {
  bookId: string | null;
  docId: string | null;
  collectionId: string | null;
  entryId: string | null;
  datagridId: string | null;
  rowId: string | null;
  whiteboardId: string | null;
}

// A partial location accepted by `navigateTo`; omitted axes default to `null`.
type Location = Partial<HistoryEntry>;

const EMPTY_LOCATION: HistoryEntry = {
  bookId: null,
  docId: null,
  collectionId: null,
  entryId: null,
  datagridId: null,
  rowId: null,
  whiteboardId: null,
};

interface UIState {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  activeBookId: string | null;
  activeDocId: string | null;
  activeCollectionId: string | null;
  activeEntryId: string | null;
  activeDatagridId: string | null;
  activeDatagridRowId: string | null;
  activeWhiteboardId: string | null;
  rowOpenMode: RowOpenMode;
  // Per-datagrid memory of the last chosen row-open mode, so reopening a
  // datagrid restores how its rows opened. Ephemeral (never persisted).
  rowOpenModeByDatagridId: Record<string, RowOpenMode>;
  expandedFolderIds: string[];
  expandedDocIds: string[];
  history: HistoryEntry[];
  historyIndex: number;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setActiveBook: (id: string | null) => void;
  setActiveDoc: (id: string | null) => void;
  setActiveCollection: (id: string | null) => void;
  setActiveEntry: (id: string, collectionId: string) => void;
  setActiveDatagrid: (id: string | null) => void;
  setActiveDatagridRow: (rowId: string, datagridId: string) => void;
  setActiveWhiteboard: (id: string | null) => void;
  setRowOpenMode: (mode: RowOpenMode) => void;
  navigateTo: (location: Location) => void;
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

// The four active-selection fields derived from a location, so every setter maps
// a location onto the store the same way.
const locationState = (loc: HistoryEntry) => ({
  activeBookId: loc.bookId,
  activeDocId: loc.docId,
  activeCollectionId: loc.collectionId,
  activeEntryId: loc.entryId,
  activeDatagridId: loc.datagridId,
  activeDatagridRowId: loc.rowId,
  activeWhiteboardId: loc.whiteboardId,
});

// Whether two locations point at the same surface (all axes match).
const sameLocation = (a: HistoryEntry | undefined, b: HistoryEntry): boolean =>
  !!a &&
  a.bookId === b.bookId &&
  a.docId === b.docId &&
  a.collectionId === b.collectionId &&
  a.entryId === b.entryId &&
  a.datagridId === b.datagridId &&
  a.rowId === b.rowId &&
  a.whiteboardId === b.whiteboardId;

// Append the freshly-visited location to the navigation history, returning the
// updated `history`/`historyIndex` slice. Consecutive duplicates of the current
// entry are dropped (re-selecting the same surface is not a navigation), and any
// forward entries are truncated — landing somewhere new after going back
// abandons the old forward trail, exactly like a browser.
const recordLocation = (
  state: Pick<UIState, "history" | "historyIndex">,
  loc: HistoryEntry,
): Pick<UIState, "history" | "historyIndex"> => {
  const current = state.history[state.historyIndex];
  if (sameLocation(current, loc)) {
    return { history: state.history, historyIndex: state.historyIndex };
  }
  const history = [...state.history.slice(0, state.historyIndex + 1), loc];
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
      activeCollectionId: null,
      activeEntryId: null,
      activeDatagridId: null,
      activeDatagridRowId: null,
      activeWhiteboardId: null,
      rowOpenMode: "modal",
      rowOpenModeByDatagridId: {},
      expandedFolderIds: [],
      expandedDocIds: [],
      history: [],
      historyIndex: -1,
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSidebarWidth: (width) => set({ sidebarWidth: clampWidth(width) }),
      // Opening a different book always lands on its Title Page, never on a
      // stale document carried over from the previously open book, and leaves
      // the collection surface. The resulting location is recorded in history.
      setActiveBook: (id) =>
        set((s) => {
          const docId = s.activeBookId === id ? s.activeDocId : null;
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            bookId: id,
            docId,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      setActiveDoc: (id) =>
        set((s) => {
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            bookId: s.activeBookId,
            docId: id,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      // Opening a different collection lands on its gallery (no entry), never a
      // stale entry from the previously open collection, and leaves the book
      // surface — mirroring `setActiveBook`.
      setActiveCollection: (id) =>
        set((s) => {
          const entryId = s.activeCollectionId === id ? s.activeEntryId : null;
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            collectionId: id,
            entryId,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      setActiveEntry: (id, collectionId) =>
        set((s) => {
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            collectionId,
            entryId: id,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      // Opening a different datagrid lands on its grid (no row), never a stale
      // row from the previously open datagrid, and leaves the book/collection
      // surfaces — mirroring `setActiveBook`/`setActiveCollection`. The
      // remembered per-datagrid row-open mode is restored when present.
      setActiveDatagrid: (id) =>
        set((s) => {
          const rowId =
            s.activeDatagridId === id ? s.activeDatagridRowId : null;
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            datagridId: id,
            rowId,
          };
          const remembered = id ? s.rowOpenModeByDatagridId[id] : undefined;
          return {
            ...locationState(loc),
            ...recordLocation(s, loc),
            rowOpenMode: remembered ?? s.rowOpenMode,
          };
        }),
      setActiveDatagridRow: (rowId, datagridId) =>
        set((s) => {
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            datagridId,
            rowId,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      setActiveWhiteboard: (id) =>
        set((s) => {
          const loc: HistoryEntry = {
            ...EMPTY_LOCATION,
            whiteboardId: id,
          };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      // Set how rows open, remembering the choice for the active datagrid so
      // reopening it restores the same mode. With no datagrid active the map is
      // left untouched.
      setRowOpenMode: (mode) =>
        set((s) => ({
          rowOpenMode: mode,
          rowOpenModeByDatagridId: s.activeDatagridId
            ? { ...s.rowOpenModeByDatagridId, [s.activeDatagridId]: mode }
            : s.rowOpenModeByDatagridId,
        })),
      // Set a whole location in one step, recording a single history entry — used
      // by cross-surface navigation (e.g. editor page links) that would otherwise
      // record a spurious intermediate location. Omitted axes default to null.
      navigateTo: (location) =>
        set((s) => {
          const loc: HistoryEntry = { ...EMPTY_LOCATION, ...location };
          return { ...locationState(loc), ...recordLocation(s, loc) };
        }),
      // Restore the previous/next visited location without recording a new
      // entry, so the history trail is preserved as the cursor moves along it.
      goBack: () =>
        set((s) => {
          const index = s.historyIndex - 1;
          const entry = s.history[index];
          if (!entry) return {};
          return { historyIndex: index, ...locationState(entry) };
        }),
      goForward: () =>
        set((s) => {
          const index = s.historyIndex + 1;
          const entry = s.history[index];
          if (!entry) return {};
          return { historyIndex: index, ...locationState(entry) };
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
