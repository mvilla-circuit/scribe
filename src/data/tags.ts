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

// Postgres unique-violation SQLSTATE, raised by the `(tag_id, target_type,
// target_id)` unique constraint on `taggables` when a pair is assigned twice.
const UNIQUE_VIOLATION = "23505";

interface AssignCollectionTagInput {
  collectionId: string;
  name: string;
}
interface UnassignCollectionTagInput {
  collectionId: string;
  tagId: string;
}
interface UpdateTagColorInput {
  tagId: string;
  color: string;
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
    queryKey: taggablesKey(COLLECTION_TARGET_TYPE),
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
      const tag: Tag = existingTag ?? {
        id: crypto.randomUUID(),
        user_id: userId,
        name,
        color: swatchForIndex(tags.length),
        position: endPositionFor(tags),
        created_at: now,
        updated_at: now,
      };

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
        qc.getQueryData<Taggable[]>(taggablesKey(COLLECTION_TARGET_TYPE)) ?? [];
      const alreadyAssigned = taggables.some(
        (row) => row.tag_id === tag.id && row.target_id === input.collectionId,
      );
      if (!alreadyAssigned) {
        const { error } = await supabase.from("taggables").insert({
          id: crypto.randomUUID(),
          user_id: userId,
          tag_id: tag.id,
          target_type: COLLECTION_TARGET_TYPE,
          target_id: input.collectionId,
        });
        if (error && error.code !== UNIQUE_VIOLATION) throw error;
        qc.setQueryData<Taggable[]>(
          taggablesKey(COLLECTION_TARGET_TYPE),
          (prev) => {
            const rows = prev ?? [];
            if (
              rows.some(
                (row) =>
                  row.tag_id === tag.id && row.target_id === input.collectionId,
              )
            ) {
              return rows;
            }
            return [
              ...rows,
              {
                id: crypto.randomUUID(),
                user_id: userId,
                tag_id: tag.id,
                target_type: COLLECTION_TARGET_TYPE,
                target_id: input.collectionId,
                created_at: now,
              },
            ];
          },
        );
      }

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
      key: taggablesKey(COLLECTION_TARGET_TYPE),
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
