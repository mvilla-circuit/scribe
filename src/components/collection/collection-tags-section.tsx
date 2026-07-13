import { EntityTagsSection } from "@/components/tags/entity-tags-section";

/**
 * Masthead seam for a collection's tags.
 */
export function CollectionTagsSection({
  collectionId,
}: {
  collectionId: string;
}) {
  return (
    <EntityTagsSection
      targetType="collection"
      targetId={collectionId}
      ariaLabel="Collection tags"
    />
  );
}
