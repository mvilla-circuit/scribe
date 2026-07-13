import { createContext, useContext } from "react";

import type { PageTargetType } from "./extensions/page-ref";

/**
 * The live display data for a page-link card, resolved from the host app's data
 * layer. Built by {@link EditorBridge.resolvePageTarget} so the editor never has
 * to know how pages and books are stored or fetched.
 */
export interface ResolvedPageTarget {
  title: string;
  icon: string | null;
  fallbackGlyph: "page" | "book";
  breadcrumb: string;
  bookId: string;
  /** Null for a book or a book's title page (navigation lands on the book). */
  docId: string | null;
}

/** A single linkable target (page or book) offered by the "Link to page" picker. */
export interface PageLinkOption {
  targetType: PageTargetType;
  targetId: string;
  label: string;
  icon: string | null;
  glyph: "page" | "book";
  subtitle: string;
}

/**
 * The live display data for a datagrid-row embed card. Built by
 * {@link EditorBridge.resolveDatagridRow} so the NodeView never imports
 * `@/data` — only this plain preview shape.
 */
export interface ResolvedDatagridRow {
  title: string;
  icon: string | null;
  coverUrl: string | null;
  /** Owning datagrid's display name (crumb / context). */
  datagridName: string;
  /** Up to five non-empty plain-text field value lines. */
  fieldsPreview: { fieldId: string; text: string }[];
}

/** A datagrid offered by the first step of the "Datagrid card" picker. */
export interface DatagridLinkOption {
  datagridId: string;
  label: string;
  icon: string | null;
  subtitle: string;
}

/** A row offered by the second step of the "Datagrid card" picker. */
export interface DatagridRowLinkOption {
  datagridId: string;
  rowId: string;
  label: string;
  icon: string | null;
  subtitle: string;
}

/**
 * The seam between the editor and the app it lives in. The editor's page-link
 * and datagrid-row embed features (live-resolving cards and pickers) depend only
 * on this interface; the host supplies an implementation backed by its data
 * layer and router/store. This keeps `src/editor` free of `@/data` and
 * `@/store` imports (Dependency Inversion) and makes the cards testable with a
 * fake bridge.
 */
export interface EditorBridge {
  /** True while the page index / books / datagrids are still loading. */
  loading: boolean;
  /** Resolve a page/book target to its current display data, or null if absent. */
  resolvePageTarget: (
    targetType: PageTargetType,
    targetId: string | null,
  ) => ResolvedPageTarget | null;
  /** Every linkable page and book, for the "Link to page" picker. */
  pageLinkOptions: PageLinkOption[];
  /** Navigate the app to a page/book target. */
  navigateToPage: (target: { bookId: string; docId: string | null }) => void;
  /** Resolve a datagrid-row embed to its live card preview, or null if absent. */
  resolveDatagridRow: (
    datagridId: string | null,
    rowId: string | null,
  ) => ResolvedDatagridRow | null;
  /** Every datagrid, for the first step of the "Datagrid card" picker. */
  datagridLinkOptions: DatagridLinkOption[];
  /** Rows belonging to one datagrid, for the second picker step. */
  datagridRowLinkOptions: (datagridId: string) => DatagridRowLinkOption[];
  /** Navigate the app to a datagrid row. */
  navigateToDatagridRow: (target: {
    datagridId: string;
    rowId: string;
  }) => void;
}

export const EditorBridgeContext = createContext<EditorBridge | null>(null);

/**
 * Access the {@link EditorBridge} provided by the host app. Throws when used
 * outside a provider so missing wiring fails loudly instead of silently
 * rendering empty page links.
 */
export function useEditorBridge(): EditorBridge {
  const bridge = useContext(EditorBridgeContext);
  if (!bridge) {
    throw new Error(
      "useEditorBridge must be used within an EditorBridgeContext provider",
    );
  }
  return bridge;
}
