import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";

// Stands in for DocumentView during a cold load when the user's last page was a
// deep document, so the reading surface holds its shape instead of flashing the
// Title Page before the documents query resolves. Mirrors DocumentView's frame:
// a sticky top bar, a centered article column, title, and a few prose blocks.
export function DocumentSkeleton() {
  return (
    <div className="flex min-h-full flex-col">
      <nav
        aria-hidden
        data-tauri-drag-region
        className="sticky top-0 z-20 flex items-center gap-2 bg-bg px-8 py-3"
      >
        <Skeleton width="6rem" height="0.8rem" />
        <Skeleton width="0.5rem" height="0.8rem" />
        <Skeleton width="8rem" height="0.8rem" />
      </nav>

      <div className="mx-auto flex w-full max-w-[1120px] justify-center gap-12 px-8 py-12 sm:py-16">
        <article className="w-full min-w-0 max-w-[68ch]">
          <Skeleton width={48} height={48} radius={8} className="mb-3" />
          <Skeleton width="70%" height="2.4rem" radius={6} />
          <Skeleton width="5rem" height="0.7rem" className="mt-4" />

          <div className="mt-10 flex flex-col gap-6">
            <SkeletonText lines={3} lineHeight="0.85rem" />
            <SkeletonText lines={4} lineHeight="0.85rem" />
            <SkeletonText lines={2} lineHeight="0.85rem" />
          </div>
        </article>
      </div>
    </div>
  );
}
