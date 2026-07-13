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
import { listHandlers, patchById } from "./optimistic-list";
import { byPosition, endPositionFor } from "./ordering";
import { allTaggablesKey, taggablesKey, tagsKey } from "./query-keys";

/** A library tag row from the `tags` table. */
export type Tag = Tables<"tags">;

/** A tag assignment row from the polymorphic `taggables` table. */
export type Taggable = Tables<"taggables">;

/** A supported polymorphic target for a tag assignment. */
export type TagTargetType = "book" | "collection" | "entry";

// Postgres unique-violation SQLSTATE, raised by the `(tag_id, target_type,
// target_id)` unique constraint on `taggables` when a pair is assigned twice.
const UNIQUE_VIOLATION = "23505";

interface AssignTagInput {
  targetType: TagTargetType;
  targetId: string;
  name: string;
  /** Optional palette hue; when omitted, the next Morandi swatch is used. */
  color?: string;
}
interface AssignCollectionTagInput {
  collectionId: string;
  name: string;
  /** Optional palette hue; when omitted, the next Morandi swatch is used. */
  color?: string;
}
interface AssignBookTagInput {
  bookId: string;
  name: string;
  /** Optional palette hue; when omitted, the next Morandi swatch is used. */
  color?: string;
}
interface UnassignTagInput {
  targetType: TagTargetType;
  targetId: string;
  tagId: string;
}
interface UnassignCollectionTagInput {
  collectionId: string;
  tagId: string;
}
interface UnassignBookTagInput {
  bookId: string;
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

function matchesAssignment(
  row: Taggable,
  tagId: string,
  targetType: TagTargetType,
  targetId: string,
): boolean {
  return (
    row.tag_id === tagId &&
    row.target_type === targetType &&
    row.target_id === targetId
  );
}

function isAssigned(
  rows: Taggable[],
  tagId: string,
  targetType: TagTargetType,
  targetId: string,
): boolean {
  return rows.some((row) =>
    matchesAssignment(row, tagId, targetType, targetId),
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

function appendTaggable(
  rows: Taggable[],
  row: Taggable,
  targetType: TagTargetType,
  targetId: string,
): Taggable[] {
  if (isAssigned(rows, row.tag_id, targetType, targetId)) return rows;
  return [...rows, row];
}

function cacheAssignment(
  qc: QueryClient,
  row: Taggable,
  targetType: TagTargetType,
  targetId: string,
): void {
  qc.setQueryData<Taggable[]>(taggablesKey(targetType), (prev) =>
    appendTaggable(prev ?? [], row, targetType, targetId),
  );
  qc.setQueryData<Taggable[]>(allTaggablesKey, (prev) =>
    appendTaggable(prev ?? [], row, targetType, targetId),
  );
}

function removeAssignment(
  rows: Taggable[],
  tagId: string,
  targetType: TagTargetType,
  targetId: string,
): Taggable[] {
  return rows.filter(
    (row) => !matchesAssignment(row, tagId, targetType, targetId),
  );
}

async function fetchTaggables(targetType?: TagTargetType): Promise<Taggable[]> {
  let query = supabase.from("taggables").select("*");
  if (targetType) query = query.eq("target_type", targetType);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Query hook for all of the signed-in user's tags, ordered by position. */
export function useTags() {
  return useQuery({
    queryKey: tagsKey,
    queryFn: fetchTags,
  });
}

/** Query hook for tag assignments on one target type. */
export function useTaggables(targetType: TagTargetType) {
  return useQuery({
    queryKey: taggablesKey(targetType),
    queryFn: () => fetchTaggables(targetType),
  });
}

/**
 * Query hook for every taggable row across target types. Used for library-wide
 * recent-use suggestion ordering without pairwise per-type merges.
 */
export function useAllTaggables() {
  return useQuery({
    queryKey: allTaggablesKey,
    queryFn: () => fetchTaggables(),
  });
}

/** Query hook for tag assignments on books. */
export function useBookTaggables() {
  return useTaggables("book");
}

/** Query hook for tag assignments on collections. */
export function useCollectionTaggables() {
  return useTaggables("collection");
}

/**
 * Joins tags and taggables in memory for one polymorphic target, ordered
 * alphabetically by tag name.
 */
export function tagsForTarget(
  tags: Tag[],
  taggables: Taggable[],
  targetType: TagTargetType,
  targetId: string,
): Tag[] {
  const tagIds = new Set(
    taggables
      .filter(
        (taggable) =>
          taggable.target_type === targetType &&
          taggable.target_id === targetId,
      )
      .map((taggable) => taggable.tag_id),
  );
  return tags
    .filter((tag) => tagIds.has(tag.id))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
}

/** Returns the tags assigned to one book. */
export function tagsForBook(
  tags: Tag[],
  taggables: Taggable[],
  bookId: string,
): Tag[] {
  return tagsForTarget(tags, taggables, "book", bookId);
}

/** Returns the tags assigned to one collection. */
export function tagsForCollection(
  tags: Tag[],
  taggables: Taggable[],
  collectionId: string,
): Tag[] {
  return tagsForTarget(tags, taggables, "collection", collectionId);
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

function useAssignTagMutation<TInput>(
  normalizeInput: (input: TInput) => AssignTagInput,
) {
  const qc = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (rawInput: TInput): Promise<Tag> => {
      const input = normalizeInput(rawInput);
      const userId = requireUserId(session);
      const name = input.name.trim();
      if (!name) throw new Error("Tag name is required");

      let tags = await loadTags(qc);
      let tag = findTagByName(tags, name);
      const now = new Date().toISOString();

      if (!tag) {
        const created = buildTag({
          userId,
          name,
          color: input.color ?? swatchForIndex(tags.length),
          position: endPositionFor(tags),
          now,
        });
        const { error } = await supabase.from("tags").insert({
          id: created.id,
          user_id: created.user_id,
          name: created.name,
          color: created.color,
          position: created.position,
        });
        if (error) {
          // Another client (or a stale cache) already created this name —
          // refetch and reuse rather than surfacing the unique violation.
          if (error.code !== UNIQUE_VIOLATION) throw error;
          tags = await fetchTags();
          qc.setQueryData(tagsKey, tags);
          tag = findTagByName(tags, name);
          if (!tag) throw error;
        } else {
          tag = created;
          qc.setQueryData<Tag[]>(tagsKey, (prev) =>
            [...(prev ?? []), created].sort(byPosition),
          );
        }
      }

      const key = taggablesKey(input.targetType);
      const taggables = qc.getQueryData<Taggable[]>(key) ?? [];
      if (isAssigned(taggables, tag.id, input.targetType, input.targetId)) {
        return tag;
      }

      const assignment: Taggable = {
        id: crypto.randomUUID(),
        user_id: userId,
        tag_id: tag.id,
        target_type: input.targetType,
        target_id: input.targetId,
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

      cacheAssignment(qc, assignment, input.targetType, input.targetId);
      return tag;
    },
    onError: () => {
      toast.error("Couldn't add tag");
    },
  });
}

/**
 * Mutation hook that assigns a tag by name to a polymorphic target. Reuses an
 * existing tag case-insensitively; otherwise creates one with the next
 * palette swatch and end position. A pairing that's already assigned — or
 * rejected by the database's unique constraint in a race — is a success
 * no-op rather than an error, so callers never need to pre-check membership.
 *
 * When creating a tag, `color` is applied only to the new row. Reusing an
 * existing name keeps that tag's color; pass a separate recolor mutation to
 * change it.
 */
export function useAssignTag() {
  return useAssignTagMutation<AssignTagInput>((input) => input);
}

/** Mutation hook that assigns a tag by name to a book. */
export function useAssignBookTag() {
  return useAssignTagMutation<AssignBookTagInput>((input) => ({
    targetType: "book",
    targetId: input.bookId,
    name: input.name,
    color: input.color,
  }));
}

/** Mutation hook that assigns a tag by name to a collection. */
export function useAssignCollectionTag() {
  return useAssignTagMutation<AssignCollectionTagInput>((input) => ({
    targetType: "collection",
    targetId: input.collectionId,
    name: input.name,
    color: input.color,
  }));
}

const UNASSIGN_MUTATION_KEY = ["taggables", "unassign"] as const;

function useUnassignTagMutation<TInput>(
  normalizeInput: (input: TInput) => UnassignTagInput,
) {
  const qc = useQueryClient();
  return useMutation({
    // Scope concurrent-settle deferral to unassign mutations so an in-flight
    // sibling can't be clobbered by an earlier settle's refetch (same recipe as
    // optimisticListHandlers / invalidateOnSettle).
    mutationKey: UNASSIGN_MUTATION_KEY,
    mutationFn: async (rawInput: TInput) => {
      const input = normalizeInput(rawInput);
      await execWrite(
        supabase
          .from("taggables")
          .delete()
          .eq("tag_id", input.tagId)
          .eq("target_type", input.targetType)
          .eq("target_id", input.targetId),
      );
    },
    onMutate: async (rawInput) => {
      const input = normalizeInput(rawInput);
      const key = taggablesKey(input.targetType);
      await qc.cancelQueries({ queryKey: key });
      await qc.cancelQueries({ queryKey: allTaggablesKey });
      const previous = qc.getQueryData<Taggable[]>(key);
      const previousAll = qc.getQueryData<Taggable[]>(allTaggablesKey);
      qc.setQueryData<Taggable[]>(key, (prev) =>
        removeAssignment(
          prev ?? [],
          input.tagId,
          input.targetType,
          input.targetId,
        ),
      );
      qc.setQueryData<Taggable[]>(allTaggablesKey, (prev) =>
        removeAssignment(
          prev ?? [],
          input.tagId,
          input.targetType,
          input.targetId,
        ),
      );
      return { key, previous, previousAll };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        qc.setQueryData(context.key, context.previous);
      }
      if (context?.previousAll) {
        qc.setQueryData(allTaggablesKey, context.previousAll);
      }
      toast.error("Couldn't remove tag");
    },
    onSettled: (_data, _error, rawInput) => {
      // Defer refetch until the last in-flight unassign settles so an earlier
      // settle can't restore edges another unassign already removed optimistically.
      if (qc.isMutating({ mutationKey: UNASSIGN_MUTATION_KEY }) > 1) return;
      const input = normalizeInput(rawInput);
      void qc.invalidateQueries({ queryKey: taggablesKey(input.targetType) });
      void qc.invalidateQueries({ queryKey: allTaggablesKey });
    },
  });
}

/**
 * Mutation hook that removes a taggable edge from a polymorphic target while
 * leaving the library tag row intact.
 */
export function useUnassignTag() {
  return useUnassignTagMutation<UnassignTagInput>((input) => input);
}

/** Mutation hook that removes a taggable edge from a book. */
export function useUnassignBookTag() {
  return useUnassignTagMutation<UnassignBookTagInput>((input) => ({
    targetType: "book",
    targetId: input.bookId,
    tagId: input.tagId,
  }));
}

/** Mutation hook that removes a taggable edge from a collection. */
export function useUnassignCollectionTag() {
  return useUnassignTagMutation<UnassignCollectionTagInput>((input) => ({
    targetType: "collection",
    targetId: input.collectionId,
    tagId: input.tagId,
  }));
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
 * it so the suggestions list and all target chips update together.
 */
export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DeleteTagInput) =>
      execWrite(supabase.from("tags").delete().eq("id", input.tagId)),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: tagsKey });
      await qc.cancelQueries({ queryKey: ["taggables"] });
      const previousTags = qc.getQueryData<Tag[]>(tagsKey);
      const previousTaggables = qc.getQueriesData<Taggable[]>({
        queryKey: ["taggables"],
      });
      qc.setQueryData<Tag[]>(tagsKey, (prev) =>
        (prev ?? []).filter((tag) => tag.id !== input.tagId),
      );
      qc.setQueriesData<Taggable[]>({ queryKey: ["taggables"] }, (prev) =>
        (prev ?? []).filter((row) => row.tag_id !== input.tagId),
      );
      return { previousTags, previousTaggables };
    },
    onError: (_error, _input, context) => {
      if (context?.previousTags) {
        qc.setQueryData(tagsKey, context.previousTags);
      }
      for (const [key, taggables] of context?.previousTaggables ?? []) {
        qc.setQueryData(key, taggables);
      }
      toast.error("Couldn't delete tag");
    },
  });
}
