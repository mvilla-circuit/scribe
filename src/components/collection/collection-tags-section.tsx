import { useMemo } from "react";

import {
  tagsByRecentUse,
  tagsForCollection,
  useAssignCollectionTag,
  useCollectionTaggables,
  useDeleteTag,
  useTags,
  useUnassignCollectionTag,
  useUpdateTagColor,
  useUpdateTagName,
} from "@/data/tags";

import { CollectionTags } from "./collection-tags";

/**
 * Masthead seam for a collection's tags: joins the library `tags` list and
 * `taggables` assignments down to this collection, and routes chip edits
 * through the assign/unassign/recolor/rename/delete mutations.
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
  const updateTagName = useUpdateTagName();
  const deleteTag = useDeleteTag();

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const taggables = useMemo(
    () => taggablesQuery.data ?? [],
    [taggablesQuery.data],
  );
  const assigned = useMemo(
    () => tagsForCollection(tags, taggables, collectionId),
    [tags, taggables, collectionId],
  );
  const suggestions = useMemo(
    () => tagsByRecentUse(tags, taggables),
    [tags, taggables],
  );

  return (
    <CollectionTags
      tags={assigned}
      suggestions={suggestions}
      onAdd={(name, color) => {
        assignTag.mutate({ collectionId, name, color });
      }}
      onRemove={(tagId) => {
        unassignTag.mutate({ collectionId, tagId });
      }}
      onRecolor={(tagId, color) => {
        updateTagColor.mutate({ tagId, color });
      }}
      onRename={(tagId, name) => {
        updateTagName.mutate({ tagId, name });
      }}
      onDeleteSuggestion={(tagId) => {
        deleteTag.mutate({ tagId });
      }}
    />
  );
}
