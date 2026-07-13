import { EntityTagsSection } from "@/components/tags/entity-tags-section";

/**
 * Masthead seam for a book's tags.
 */
export function BookTagsSection({ bookId }: { bookId: string }) {
  return (
    <EntityTagsSection
      targetType="book"
      targetId={bookId}
      ariaLabel="Book tags"
    />
  );
}
