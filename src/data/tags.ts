import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { swatchForIndex } from "@/lib/swatches";

import { execWrite, requireUserId } from "./crud";
import {
  listHandlers,
  optimisticListHandlers,
  patchById,
} from "./optimistic-list";
import { byPosition, endPositionFor } from "./ordering";
import { taggablesKey, tagsKey } from "./query-keys";

/** A library tag row from the `tags` table. */
export type Tag = Tables<"tags">;

/** A tag assignment row from the polymorphic `taggables` table. */
export type Taggable = Tables<"taggables">;

// The only `taggables.target_type` this module deals with; books/entries have
// their own tagging surfaces built on the same table.
const COLLECTION_TARGET_TYPE = "collection";
const COLLECTION_TAGGABLES_KEY = taggablesKey(COLLECTION_TARGET_TYPE);

// Postgres unique-violation SQLSTATE, raised by the `(tag_id, target_type,
// target_id)` unique constraint on `taggables` when a pair is assigned twice.
const UNIQUE_VIOLATION = "23505";

interface AssignCollectionTagInput {
  collectionId: string;
  name: string;
  /** Optional palette hue; when omitted, the next Morandi swatch is used. */
  color?: string;
}
interface UnassignCollectionTagInput {
  collectionId: string;
  tagId: string;
}
interface UpdateTagColorInput {
  tagId: string;
  color: string;
}
interface UpdateTagNameInput {
  tagId: string;
  name: string;
}
interface DeleteTagInput {
  tagId: string;
}

async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).slice().sort(byPosition);
}

// Reads the tags list from the cache when present (as populated by `useTags`
// or a prior assignment in this session), falling back to a fresh fetch so an
// assignment before the list has ever been queried still sees real tags.
async function loadTags(qc: QueryClient): Promise<Tag[]> {
  const cached = qc.getQueryData<Tag[]>(tagsKey);
  return cached ?? (await fetchTags());
}

function findTagByName(tags: Tag[], name: string): Tag | undefined {
  const lower = name.toLowerCase();
  return tags.find((tag) => tag.name.toLowerCase() === lower);
}

function isAssignedToCollection(
  rows: Taggable[],
  tagId: string,
  collectionId: string,
): boolean {
  return rows.some(
    (row) => row.tag_id === tagId && row.target_id === collectionId,
  );
}

function buildTag(input: {
  userId: string;
  name: string;
  color: string;
  position: number;
  now: string;
}): Tag {
  return {
    id: crypto.randomUUID(),
    user_id: input.userId,
    name: input.name,
    color: input.color,
    position: input.position,
    created_at: input.now,
    updated_at: input.now,
  };
}

function cacheCollectionAssignment(
  qc: QueryClient,
  row: Taggable,
  collectionId: string,
): void {
  qc.setQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY, (prev) => {
    const rows = prev ?? [];
    if (isAssignedToCollection(rows, row.tag_id, collectionId)) return rows;
    return [...rows, row];
  });
}

/** Query hook for all of the signed-in user's tags, ordered by position. */
export function useTags() {
  return useQuery({
    queryKey: tagsKey,
    queryFn: fetchTags,
  });
}

/** Query hook for the tag assignments on collections. */
export function useCollectionTaggables() {
  return useQuery({
    queryKey: COLLECTION_TAGGABLES_KEY,
    queryFn: async (): Promise<Taggable[]> => {
      const { data, error } = await supabase
        .from("taggables")
        .select("*")
        .eq("target_type", COLLECTION_TARGET_TYPE);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Joins `tags` and `taggables` in memory to the tags assigned to one
 * collection, so callers don't each hand-roll the filter/lookup over the two
 * independently-cached lists.
 */
export function tagsForCollection(
  tags: Tag[],
  taggables: Taggable[],
  collectionId: string,
): Tag[] {
  const tagIds = new Set(
    taggables
      .filter(
        (taggable) =>
          taggable.target_type === COLLECTION_TARGET_TYPE &&
          taggable.target_id === collectionId,
      )
      .map((taggable) => taggable.tag_id),
  );
  return tags.filter((tag) => tagIds.has(tag.id));
}

/**
 * Orders library tags by most recent use: latest `taggables.created_at` for
 * that tag wins, falling back to the tag's own `updated_at` when never
 * assigned. Used to surface recently used suggestions in the add-tag menu.
 */
export function tagsByRecentUse(tags: Tag[], taggables: Taggable[]): Tag[] {
  const lastUsed = new Map<string, string>();
  for (const row of taggables) {
    const prev = lastUsed.get(row.tag_id);
    if (!prev || row.created_at > prev) {
      lastUsed.set(row.tag_id, row.created_at);
    }
  }

  return [...tags].sort((a, b) => {
    const aUsed = lastUsed.get(a.id);
    const bUsed = lastUsed.get(b.id);
    if (aUsed && bUsed) return bUsed.localeCompare(aUsed);
    if (aUsed) return -1;
    if (bUsed) return 1;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

/**
 * Mutation hook that assigns a tag (by name) to a collection. Reuses an
 * existing tag case-insensitively; otherwise creates one with the next
 * palette swatch and end position. A pairing that's already assigned — or
 * rejected by the database's unique constraint in a race — is a success
 * no-op rather than an error, so callers never need to pre-check membership.
 */
export function useAssignCollectionTag() {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (input: AssignCollectionTagInput): Promise<Tag> => {
      const userId = requireUserId(session);
      const name = input.name.trim();
      if (!name) throw new Error("Tag name is required");

      const tags = await loadTags(qc);
      const existingTag = findTagByName(tags, name);
      const now = new Date().toISOString();
      const tag =
        existingTag ??
        buildTag({
          userId,
          name,
          color: input.color ?? swatchForIndex(tags.length),
          position: endPositionFor(tags),
          now,
        });

      if (!existingTag) {
        await execWrite(
          supabase.from("tags").insert({
            id: tag.id,
            user_id: tag.user_id,
            name: tag.name,
            color: tag.color,
            position: tag.position,
          }),
        );
        qc.setQueryData<Tag[]>(tagsKey, (prev) =>
          [...(prev ?? []), tag].sort(byPosition),
        );
      }

      const taggables =
        qc.getQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY) ?? [];
      if (isAssignedToCollection(taggables, tag.id, input.collectionId)) {
        return tag;
      }

      const assignment: Taggable = {
        id: crypto.randomUUID(),
        user_id: userId,
        tag_id: tag.id,
        target_type: COLLECTION_TARGET_TYPE,
        target_id: input.collectionId,
        created_at: now,
      };
      const { error } = await supabase.from("taggables").insert({
        id: assignment.id,
        user_id: assignment.user_id,
        tag_id: assignment.tag_id,
        target_type: assignment.target_type,
        target_id: assignment.target_id,
      });
      if (error && error.code !== UNIQUE_VIOLATION) throw error;

      cacheCollectionAssignment(qc, assignment, input.collectionId);
      return tag;
    },
    onError: () => {
      toast.error("Couldn't add tag");
    },
  });
}

/**
 * Mutation hook that removes a tag from a collection. Deletes only the
 * `taggables` edge — the tag row itself, and its assignments to any other
 * collection, are left untouched.
 */
export function useUnassignCollectionTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UnassignCollectionTagInput) => {
      await execWrite(
        supabase
          .from("taggables")
          .delete()
          .eq("tag_id", input.tagId)
          .eq("target_type", COLLECTION_TARGET_TYPE)
          .eq("target_id", input.collectionId),
      );
    },
    ...optimisticListHandlers<Taggable, UnassignCollectionTagInput>({
      qc,
      key: COLLECTION_TAGGABLES_KEY,
      sort: (a, b) => a.created_at.localeCompare(b.created_at),
      update: (prev, input) =>
        prev.filter(
          (row) =>
            !(
              row.tag_id === input.tagId && row.target_id === input.collectionId
            ),
        ),
      errorMessage: "Couldn't remove tag",
    }),
  });
}

/** Mutation hook that updates a tag's palette swatch color. */
export function useUpdateTagColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTagColorInput) =>
      execWrite(
        supabase
          .from("tags")
          .update({ color: input.color })
          .eq("id", input.tagId),
      ),
    ...listHandlers<Tag, UpdateTagColorInput>({
      qc,
      key: tagsKey,
      update: (prev, input) =>
        patchById(prev, input.tagId, { color: input.color }),
      errorMessage: "Couldn't update tag color",
    }),
  });
}

/** Mutation hook that renames a tag in the library. */
export function useUpdateTagName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTagNameInput) => {
      const name = input.name.trim();
      if (!name) throw new Error("Tag name is required");
      return execWrite(
        supabase.from("tags").update({ name }).eq("id", input.tagId),
      );
    },
    ...listHandlers<Tag, UpdateTagNameInput>({
      qc,
      key: tagsKey,
      update: (prev, input) => {
        const name = input.name.trim();
        return patchById(prev, input.tagId, { name });
      },
      errorMessage: "Couldn't rename tag",
    }),
  });
}

/**
 * Mutation hook that deletes a library tag. Cascades through `taggables` in
 * the database; the cache drops the tag and every assignment that pointed at
 * it so the suggestions list and collection chips update together.
 */
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteTagInput) =>
      execWrite(supabase.from("tags").delete().eq("id", input.tagId)),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: tagsKey });
      await qc.cancelQueries({ queryKey: COLLECTION_TAGGABLES_KEY });
      const previousTags = qc.getQueryData<Tag[]>(tagsKey);
      const previousTaggables = qc.getQueryData<Taggable[]>(
        COLLECTION_TAGGABLES_KEY,
      );
      qc.setQueryData<Tag[]>(tagsKey, (prev) =>
        (prev ?? []).filter((tag) => tag.id !== input.tagId),
      );
      qc.setQueryData<Taggable[]>(COLLECTION_TAGGABLES_KEY, (prev) =>
        (prev ?? []).filter((row) => row.tag_id !== input.tagId),
      );
      return { previousTags, previousTaggables };
    },
    onError: (_error, _input, context) => {
      if (context?.previousTags) {
        qc.setQueryData(tagsKey, context.previousTags);
      }
      if (context?.previousTaggables) {
        qc.setQueryData(COLLECTION_TAGGABLES_KEY, context.previousTaggables);
      }
      toast.error("Couldn't delete tag");
    },
  });
}
