import { type RefObject, useEffect, useRef, useState } from "react";

/**
 * Reveal a long list one page at a time as the user scrolls, so each item can
 * mount lazily instead of all at once. Returns the number of items to render,
 * whether more remain, and a `sentinelRef` to place after the last rendered
 * item — when it scrolls into view the next page is revealed. Changing
 * `resetKey` (e.g. a search query) snaps the window back to the first page.
 */
export function useInfiniteReveal({
  total,
  pageSize,
  resetKey,
}: {
  total: number;
  pageSize: number;
  resetKey?: unknown;
}): {
  visibleCount: number;
  hasMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
} {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset the window when the source changes, during render rather than in an
  // effect (per React's "you might not need an effect" guidance).
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setVisibleCount(pageSize);
  }

  const hasMore = visibleCount < total;
  const revealed = Math.min(visibleCount, total);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => count + pageSize);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, revealed, pageSize]);

  return { visibleCount, hasMore, sentinelRef };
}
