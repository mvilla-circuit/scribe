import { useMemo } from "react";

import { EntityTags } from "@/components/ui/entity-tags";
import {
  tagsByRecentUse,
  tagsForBook,
  useAssignBookTag,
  useBookTaggables,
  useCollectionTaggables,
  useDeleteTag,
  useTags,
  useUnassignBookTag,
  useUpdateTagColor,
  useUpdateTagName,
} from "@/data/tags";

/**
 * Masthead seam for a book's tags: joins the library `tags` list and
 * `taggables` assignments down to this book, and routes chip edits through
 * the assign/unassign/recolor/rename/delete mutations.
 */
export function BookTagsSection({ bookId }: { bookId: string }) {
  const tagsQuery = useTags();
  const bookTaggablesQuery = useBookTaggables();
  const collectionTaggablesQuery = useCollectionTaggables();
  const assignTag = useAssignBookTag();
  const unassignTag = useUnassignBookTag();
  const updateTagColor = useUpdateTagColor();
  const updateTagName = useUpdateTagName();
  const deleteTag = useDeleteTag();

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const bookTaggables = useMemo(
    () => bookTaggablesQuery.data ?? [],
    [bookTaggablesQuery.data],
  );
  const collectionTaggables = useMemo(
    () => collectionTaggablesQuery.data ?? [],
    [collectionTaggablesQuery.data],
  );
  const assigned = useMemo(
    () => tagsForBook(tags, bookTaggables, bookId),
    [tags, bookTaggables, bookId],
  );
  const suggestions = useMemo(
    () => tagsByRecentUse(tags, [...collectionTaggables, ...bookTaggables]),
    [tags, collectionTaggables, bookTaggables],
  );

  return (
    <EntityTags
      ariaLabel="Book tags"
      tags={assigned}
      suggestions={suggestions}
      onAdd={(name, color) => {
        assignTag.mutate({ bookId, name, color });
      }}
      onRemove={(tagId) => {
        unassignTag.mutate({ bookId, tagId });
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
