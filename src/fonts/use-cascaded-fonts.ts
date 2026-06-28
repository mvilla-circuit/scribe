import { type CSSProperties, useMemo } from "react";

import type { Book } from "@/data/books";
import { bookFontOverrides } from "@/data/books";
import type { DocumentMeta } from "@/data/documents";
import { docFontOverrides } from "@/data/documents";
import { profileFonts, useProfile } from "@/data/profile";

import type { FontMap, ResolvedFonts } from "./catalog";
import { resolveFonts } from "./resolve";
import {
  type FontOverrideHandlers,
  useFontOverrides,
} from "./use-font-overrides";
import { useScopedFonts } from "./use-scoped-fonts";

interface UseCascadedFontsOptions {
  /** The book whose Title Page or pages are being read. */
  book: Book;
  /**
   * The page being edited. Provide it to make the page the editable scope
   * (inheriting global + book); omit it to edit the book scope (inheriting
   * global), as the Title Page does.
   */
  document?: DocumentMeta | null;
  /** Persist the editable scope's next override map (null clears it). */
  onChangeOverrides: (fonts: FontMap | null) => void;
}

/** The resolved font cascade plus the handles a reading surface needs. */
export interface CascadedFonts {
  /** Inline style scoping --font-display/text/code onto the reading surface. */
  fontVars: CSSProperties;
  /** The fully-resolved fonts after layering global -> book -> page. */
  resolved: ResolvedFonts;
  /** Resolved fonts for the layers below the editable scope (what it inherits). */
  inherited: ResolvedFonts;
  /** The editable scope's own overrides (page overrides, or book overrides). */
  overrides: FontMap;
  /** set/clear/clear-all handlers bound to the editable scope. */
  handlers: FontOverrideHandlers;
}

/**
 * Resolves the font cascade for a reading surface and wires its editable scope.
 * Fonts layer global -> book -> page; pass a `document` to edit the page layer
 * (inheriting global + book) or omit it to edit the book layer (inheriting
 * global). Centralizes the resolve + scope + override-handler assembly that the
 * document view and the title page would otherwise each re-implement.
 */
export function useCascadedFonts({
  book,
  document,
  onChangeOverrides,
}: UseCascadedFontsOptions): CascadedFonts {
  const { data: profile } = useProfile();

  // The page is the editable scope when given; otherwise it's the book.
  const editingPage = document != null;

  // The cascade only depends on the profile, book, and page; recompute it (and
  // the `resolveFonts` layering) only when one of those changes rather than on
  // every render.
  const { overrides, inherited, resolved } = useMemo(() => {
    const globalFonts = profileFonts(profile);
    const bookOverrides = bookFontOverrides(book);
    const scopeOverrides = editingPage
      ? docFontOverrides(document)
      : bookOverrides;
    return {
      overrides: scopeOverrides,
      inherited: editingPage
        ? resolveFonts(globalFonts, bookOverrides)
        : resolveFonts(globalFonts),
      resolved: editingPage
        ? resolveFonts(globalFonts, bookOverrides, scopeOverrides)
        : resolveFonts(globalFonts, bookOverrides),
    };
  }, [profile, book, document, editingPage]);

  const fontVars = useScopedFonts(resolved);

  const handlers = useFontOverrides({
    overrides,
    collapseEmpty: editingPage,
    onChange: onChangeOverrides,
  });

  return { fontVars, resolved, inherited, overrides, handlers };
}
