import { type ReactNode, useCallback, useMemo } from "react";

import { useBooks } from "@/data/books";
import { usePageIndex } from "@/data/page-index";
import { type EditorBridge, EditorBridgeContext } from "@/editor/editor-bridge";
import { useUIStore } from "@/store/ui";

import { buildPageLinkOptions, resolvePageTarget } from "./page-link-resolve";

/**
 * Supplies the editor's {@link EditorBridge} from the app's data layer and UI
 * store, so the page-link card and picker (rendered inside `<Editor>`) can
 * resolve targets and navigate without importing `@/data` or `@/store`
 * themselves. Wrap any `<Editor>` whose content may contain page links.
 */
export function EditorBridgeHost({ children }: { children: ReactNode }) {
  const { data: index = [], isLoading: indexLoading } = usePageIndex();
  const { data: books = [], isLoading: booksLoading } = useBooks();
  const setActiveBook = useUIStore((s) => s.setActiveBook);
  const setActiveDoc = useUIStore((s) => s.setActiveDoc);

  const resolve = useCallback<EditorBridge["resolvePageTarget"]>(
    (targetType, targetId) =>
      resolvePageTarget(books, index, targetType, targetId),
    [books, index],
  );

  const pageLinkOptions = useMemo(
    () => buildPageLinkOptions(books, index),
    [books, index],
  );

  const navigateToPage = useCallback<EditorBridge["navigateToPage"]>(
    ({ bookId, docId }) => {
      setActiveBook(bookId);
      setActiveDoc(docId);
    },
    [setActiveBook, setActiveDoc],
  );

  const bridge = useMemo<EditorBridge>(
    () => ({
      loading: indexLoading || booksLoading,
      resolvePageTarget: resolve,
      pageLinkOptions,
      navigateToPage,
    }),
    [indexLoading, booksLoading, resolve, pageLinkOptions, navigateToPage],
  );

  return (
    <EditorBridgeContext.Provider value={bridge}>
      {children}
    </EditorBridgeContext.Provider>
  );
}
