import { useMemo } from "react";

import {
  tagsForCollection,
  useAssignCollectionTag,
  useCollectionTaggables,
  useTags,
  useUnassignCollectionTag,
  useUpdateTagColor,
} from "@/data/tags";

import { type CollectionTag, CollectionTags } from "./collection-tags";

function toCollectionTag(tag: {
  id: string;
  name: string;
  color: string | null;
}): CollectionTag {
  return { id: tag.id, name: tag.name, color: tag.color };
}

/**
 * Masthead seam for a collection's tags: joins the library `tags` list and
 * `taggables` assignments down to this collection, and routes chip edits
 * through the assign/unassign/recolor mutations.
 */
export function CollectionTagsSection({
  collectionId,
}: {
  collectionId: string;
}) {
  const tagsQuery = useTags();
  const taggablesQuery = useCollectionTaggables();
  const assignTag = useAssignCollectionTag();
  const unassignTag = useUnassignCollectionTag();
  const updateTagColor = useUpdateTagColor();

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const taggables = useMemo(
    () => taggablesQuery.data ?? [],
    [taggablesQuery.data],
  );
  const assigned = useMemo(
    () => tagsForCollection(tags, taggables, collectionId),
    [tags, taggables, collectionId],
  );

  return (
    <CollectionTags
      tags={assigned.map(toCollectionTag)}
      suggestions={tags.map(toCollectionTag)}
      onAdd={(name) => {
        assignTag.mutate({ collectionId, name });
      }}
      onRemove={(tagId) => {
        unassignTag.mutate({ collectionId, tagId });
      }}
      onRecolor={(tagId, color) => {
        updateTagColor.mutate({ tagId, color });
      }}
    />
  );
}
