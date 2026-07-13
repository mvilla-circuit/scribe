import { useMemo } from "react";

import { EntityTags } from "@/components/ui/entity-tags";
import {
  tagsByRecentUse,
  tagsForTarget,
  type TagTargetType,
  useAllTaggables,
  useAssignTag,
  useDeleteTag,
  useTaggables,
  useTags,
  useUnassignTag,
  useUpdateTagColor,
  useUpdateTagName,
} from "@/data/tags";

/**
 * Shared masthead seam for entity tags: joins the library `tags` list and
 * typed `taggables` for one target, ranks suggestions from the full taggables
 * list, and routes chip edits through assign/unassign/recolor/rename/delete.
 */
export function EntityTagsSection({
  targetType,
  targetId,
  ariaLabel,
}: {
  targetType: TagTargetType;
  targetId: string;
  ariaLabel: string;
}) {
  const tagsQuery = useTags();
  const taggablesQuery = useTaggables(targetType);
  const allTaggablesQuery = useAllTaggables();
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();
  const updateTagColor = useUpdateTagColor();
  const updateTagName = useUpdateTagName();
  const deleteTag = useDeleteTag();

  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const taggables = useMemo(
    () => taggablesQuery.data ?? [],
    [taggablesQuery.data],
  );
  const allTaggables = useMemo(
    () => allTaggablesQuery.data ?? [],
    [allTaggablesQuery.data],
  );
  const assigned = useMemo(
    () => tagsForTarget(tags, taggables, targetType, targetId),
    [tags, taggables, targetType, targetId],
  );
  const suggestions = useMemo(
    () => tagsByRecentUse(tags, allTaggables),
    [tags, allTaggables],
  );

  return (
    <EntityTags
      ariaLabel={ariaLabel}
      tags={assigned}
      suggestions={suggestions}
      onAdd={(name, color) => {
        assignTag.mutate({ targetType, targetId, name, color });
      }}
      onRemove={(tagId) => {
        unassignTag.mutate({ targetType, targetId, tagId });
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
