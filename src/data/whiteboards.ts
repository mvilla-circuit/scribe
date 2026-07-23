import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { emptyWhiteboardScene, sceneToJson } from "@/lib/whiteboard-scene";

import { execWrite, requireUserId } from "./crud";
import { listHandlers, patchById, removeById } from "./optimistic-list";
import { byPosition } from "./ordering";
import { whiteboardSceneKey, whiteboardsKey } from "./query-keys";

/** A single row from the `whiteboards` table, including its scene. */
export type Whiteboard = Tables<"whiteboards">;

/** A whiteboard row without its potentially large scene. */
export type WhiteboardMeta = Omit<Whiteboard, "scene">;

/** Every whiteboard column except `scene`, for the structural list. */
const WHITEBOARD_META_COLUMNS =
  "id, user_id, collection_id, book_id, parent_document_id, name, icon, cover_url, cover_position, position, created_at, updated_at" as const;

type CreateWhiteboardInput =
  | {
      id: string;
      collection_id: string;
      book_id?: never;
      parent_document_id?: never;
      name?: string;
      position: number;
    }
  | {
      id: string;
      book_id: string;
      collection_id?: never;
      parent_document_id?: string | null;
      name?: string;
      position: number;
    };

interface RenameWhiteboardInput {
  id: string;
  name: string;
}

type UpdateWhiteboardInput = { id: string } & Partial<
  Pick<Whiteboard, "name" | "icon" | "cover_url" | "cover_position">
>;

type MoveWhiteboardInput =
  | {
      id: string;
      collection_id: string;
      book_id?: never;
      parent_document_id?: never;
      position: number;
    }
  | {
      id: string;
      book_id: string;
      collection_id?: never;
      parent_document_id: string | null;
      position: number;
    };

interface DeleteWhiteboardInput {
  id: string;
}

interface UpdateWhiteboardSceneInput {
  id: string;
  scene: Json;
}

/** Query hook for all whiteboard metadata, ordered by position. */
export function useWhiteboards() {
  return useQuery({
    queryKey: whiteboardsKey,
    queryFn: async (): Promise<WhiteboardMeta[]> => {
      const { data, error } = await supabase
        .from("whiteboards")
        .select(WHITEBOARD_META_COLUMNS)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

/** Query hook for a selected whiteboard's scene. */
export function useWhiteboardScene(whiteboardId: string) {
  return useQuery({
    queryKey: whiteboardSceneKey(whiteboardId),
    queryFn: async (): Promise<Json> => {
      const { data, error } = await supabase
        .from("whiteboards")
        .select("scene")
        .eq("id", whiteboardId)
        .single();
      if (error) throw error;
      return data.scene;
    },
  });
}

async function updateWhiteboardRow(
  id: string,
  patch: TablesUpdate<"whiteboards">,
) {
  await execWrite(supabase.from("whiteboards").update(patch).eq("id", id));
}

function newWhiteboardRow(
  input: CreateWhiteboardInput,
  userId: string,
): WhiteboardMeta {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    collection_id:
      "collection_id" in input ? (input.collection_id ?? null) : null,
    book_id: "book_id" in input ? (input.book_id ?? null) : null,
    parent_document_id:
      "parent_document_id" in input ? (input.parent_document_id ?? null) : null,
    name: input.name ?? "Untitled",
    icon: null,
    cover_position: 50,
    cover_url: null,
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

function emptySceneJson(): Json {
  return sceneToJson(emptyWhiteboardScene());
}

/** Mutation hook that creates a whiteboard in a collection or book. */
export function useCreateWhiteboard() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const handlers = listHandlers<WhiteboardMeta, CreateWhiteboardInput>({
    qc,
    key: whiteboardsKey,
    update: (prev, input) => [
      ...prev,
      newWhiteboardRow(input, requireUserId(session)),
    ],
    errorMessage: "Couldn't create whiteboard",
  });
  return useMutation({
    mutationFn: async (input: CreateWhiteboardInput) => {
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newWhiteboardRow(input, requireUserId(session));
      await execWrite(
        supabase
          .from("whiteboards")
          .insert({ ...row, scene: emptySceneJson() }),
      );
    },
    ...handlers,
    onMutate: async (input) => {
      const context = await handlers.onMutate(input);
      const sceneKey = whiteboardSceneKey(input.id);
      const previousScene = qc.getQueryData<Json>(sceneKey);
      qc.setQueryData(sceneKey, emptySceneJson());
      return { ...context, sceneKey, previousScene };
    },
    onError: (error, input, context) => {
      handlers.onError(error, input, context);
      if (!context) return;
      if (context.previousScene === undefined) {
        qc.removeQueries({ queryKey: context.sceneKey });
      } else {
        qc.setQueryData(context.sceneKey, context.previousScene);
      }
    },
  });
}

/** Mutation hook that renames a whiteboard. */
export function useRenameWhiteboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameWhiteboardInput) =>
      updateWhiteboardRow(input.id, { name: input.name }),
    ...listHandlers<WhiteboardMeta, RenameWhiteboardInput>({
      qc,
      key: whiteboardsKey,
      update: (prev, input) => patchById(prev, input.id, { name: input.name }),
      errorMessage: "Couldn't rename whiteboard",
    }),
  });
}

/** Mutation hook that patches a whiteboard's editable metadata. */
export function useUpdateWhiteboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWhiteboardInput) => {
      const { id, ...patch } = input;
      return updateWhiteboardRow(id, patch);
    },
    ...listHandlers<WhiteboardMeta, UpdateWhiteboardInput>({
      qc,
      key: whiteboardsKey,
      update: (prev, input) => patchById(prev, input.id, input),
      errorMessage: "Couldn't update whiteboard",
    }),
  });
}

/** Mutation hook that repositions a whiteboard within its current owner. */
export function useMoveWhiteboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveWhiteboardInput) => {
      if ("collection_id" in input) {
        return updateWhiteboardRow(input.id, {
          collection_id: input.collection_id,
          position: input.position,
        });
      }
      return updateWhiteboardRow(input.id, {
        parent_document_id: input.parent_document_id,
        position: input.position,
      });
    },
    ...listHandlers<WhiteboardMeta, MoveWhiteboardInput>({
      qc,
      key: whiteboardsKey,
      update: (prev, input) =>
        patchById(
          prev,
          input.id,
          "collection_id" in input
            ? {
                collection_id: input.collection_id,
                position: input.position,
              }
            : {
                parent_document_id: input.parent_document_id,
                position: input.position,
              },
        ),
      errorMessage: "Couldn't move whiteboard",
    }),
  });
}

/** Mutation hook that removes a whiteboard from its collection. */
export function useDeleteWhiteboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteWhiteboardInput) => {
      await execWrite(supabase.from("whiteboards").delete().eq("id", input.id));
    },
    ...listHandlers<WhiteboardMeta, DeleteWhiteboardInput>({
      qc,
      key: whiteboardsKey,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete whiteboard",
    }),
    onSuccess: async (_data, input) => {
      const key = whiteboardSceneKey(input.id);
      await qc.cancelQueries({ queryKey: key });
      qc.removeQueries({ queryKey: key });
    },
  });
}

/** Mutation hook that persists a whiteboard's separately cached scene. */
export function useUpdateWhiteboardScene() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWhiteboardSceneInput) =>
      updateWhiteboardRow(input.id, { scene: input.scene }),
    onMutate: async (input: UpdateWhiteboardSceneInput) => {
      const key = whiteboardSceneKey(input.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Json>(key);
      qc.setQueryData<Json>(key, input.scene);
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      toast.error("Couldn't save changes");
    },
  });
}
