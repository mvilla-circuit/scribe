import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import {
  type DatagridProperties,
  toDatagridProperties,
} from "@/lib/datagrid-schema";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import {
  listHandlers,
  patchById,
  removeById,
  removeBySet,
} from "./optimistic-list";
import { byPosition } from "./ordering";
import {
  datagridRowContentKey,
  datagridRowsKey,
  NO_DATAGRID,
} from "./query-keys";

/** A single row from the `datagrid_rows` table, including its editor body. */
type DatagridRow = Tables<"datagrid_rows">;

/**
 * A row without the heavy `content` body. The per-datagrid list holds these so
 * editing a row's detail page never churns the grid's structural cache; the body
 * is fetched separately via {@link useDatagridRowContent}.
 */
export type DatagridRowMeta = Omit<DatagridRow, "content">;

// Every column except `content`, so the per-datagrid list query stays light.
const DATAGRID_ROW_META_COLUMNS =
  "id, user_id, datagrid_id, title, icon, cover_url, properties, position, created_at, updated_at" as const;

/** Mutation input shapes, shared between each `mutationFn` and its updater. */
interface CreateDatagridRowInput {
  id: string;
  title?: string;
  position: number;
  properties?: DatagridProperties;
}
type UpdateDatagridRowInput = { id: string } & Partial<{
  title: string;
  icon: string | null;
  cover_url: string | null;
  properties: DatagridProperties;
  propertyPatch: DatagridProperties;
}>;
interface DeleteDatagridRowInput {
  id: string;
}
interface DeleteDatagridRowsInput {
  ids: string[];
}
interface UpdateDatagridRowContentInput {
  id: string;
  content: Json;
}

/**
 * Query options for one datagrid's row metadata, shared by {@link useDatagridRows}
 * and by callers (e.g. the relation picker) that need to fetch several datagrids'
 * rows at once via `useQueries`.
 */
export function datagridRowsQueryOptions(datagridId: string) {
  return {
    queryKey: datagridRowsKey(datagridId),
    queryFn: async (): Promise<DatagridRowMeta[]> => {
      const { data, error } = await supabase
        .from("datagrid_rows")
        .select(DATAGRID_ROW_META_COLUMNS)
        .eq("datagrid_id", datagridId)
        .order("position", { ascending: true })
        .order("id", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  };
}

/** Query hook for one datagrid's row metadata (no editor bodies), by position. */
export function useDatagridRows(datagridId: string | null) {
  return useQuery({
    ...datagridRowsQueryOptions(datagridId ?? NO_DATAGRID),
    enabled: datagridId !== null,
  });
}

/** Query hook for a single row's editor body, split out so a body autosave
 * only touches this entry — never the structural list. */
export function useDatagridRowContent(rowId: string | null) {
  return useQuery({
    queryKey: datagridRowContentKey(rowId ?? NO_DATAGRID),
    enabled: rowId !== null,
    queryFn: async (): Promise<Json> => {
      if (rowId === null) return {};
      const { data, error } = await supabase
        .from("datagrid_rows")
        .select("content")
        .eq("id", rowId)
        .single();
      if (error) throw error;
      return data.content;
    },
  });
}

async function updateRow(id: string, patch: TablesUpdate<"datagrid_rows">) {
  await execWrite(supabase.from("datagrid_rows").update(patch).eq("id", id));
}

function newRowMeta(
  input: CreateDatagridRowInput,
  datagridId: string,
  userId: string,
): DatagridRowMeta {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    datagrid_id: datagridId,
    title: input.title ?? "Untitled",
    icon: null,
    cover_url: null,
    properties:
      input.properties === undefined ? {} : (input.properties as Json),
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

// Builds the editable patch shared by the DB write and the optimistic cache
// update, translating the typed `properties` bag into the jsonb column.
function toRowPatch(
  input: UpdateDatagridRowInput,
  currentProperties?: Json | null,
): TablesUpdate<"datagrid_rows"> {
  const patch: TablesUpdate<"datagrid_rows"> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url;
  if (input.propertyPatch !== undefined) {
    const properties: DatagridProperties = {
      ...toDatagridProperties(currentProperties),
      ...input.propertyPatch,
    };
    patch.properties = properties as Json;
  } else if (input.properties !== undefined) {
    patch.properties = input.properties as Json;
  }
  return patch;
}

/** Mutation hook that creates a row in a datagrid (optimistically appended). */
export function useCreateDatagridRow(datagridId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = datagridRowsKey(datagridId);
  return useMutation({
    mutationFn: async (input: CreateDatagridRowInput) => {
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newRowMeta(input, datagridId, requireUserId(session));
      await execWrite(
        supabase.from("datagrid_rows").insert({ ...row, content: {} }),
      );
    },
    ...listHandlers<DatagridRowMeta, CreateDatagridRowInput>({
      qc,
      key,
      update: (prev, input) => [
        ...prev,
        newRowMeta(input, datagridId, requireUserId(session)),
      ],
      errorMessage: "Couldn't create row",
    }),
  });
}

/** Generic patch for a row's editable metadata (title, icon, cover, properties). */
export function useUpdateDatagridRow(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridRowsKey(datagridId);
  return useMutation({
    // Serialize same-datagrid row updates so overlapping propertyPatch writes
    // can't land out of order and clobber each other on the full jsonb bag.
    scope: { id: `datagrid-row:${datagridId}` },
    mutationFn: (input: UpdateDatagridRowInput) => {
      const latest = qc
        .getQueryData<DatagridRowMeta[]>(key)
        ?.find((row) => row.id === input.id);
      return updateRow(input.id, toRowPatch(input, latest?.properties));
    },
    ...listHandlers<DatagridRowMeta, UpdateDatagridRowInput>({
      qc,
      key,
      update: (prev, input) => {
        const current = prev.find((row) => row.id === input.id);
        return patchById(
          prev,
          input.id,
          toRowPatch(input, current?.properties),
        );
      },
      errorMessage: "Couldn't update row",
    }),
  });
}

/** Mutation hook that deletes a single row. */
export function useDeleteDatagridRow(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridRowsKey(datagridId);
  return useMutation({
    mutationFn: async (input: DeleteDatagridRowInput) => {
      await execWrite(
        supabase.from("datagrid_rows").delete().eq("id", input.id),
      );
    },
    ...listHandlers<DatagridRowMeta, DeleteDatagridRowInput>({
      qc,
      key,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete row",
    }),
  });
}

/** Mutation hook that deletes several rows in one request (multi-select). */
export function useDeleteDatagridRows(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridRowsKey(datagridId);
  return useMutation({
    mutationFn: async (input: DeleteDatagridRowsInput) => {
      await execWrite(
        supabase.from("datagrid_rows").delete().in("id", input.ids),
      );
    },
    ...listHandlers<DatagridRowMeta, DeleteDatagridRowsInput>({
      qc,
      key,
      update: (prev, input) => removeBySet(prev, new Set(input.ids)),
      errorMessage: "Couldn't delete rows",
    }),
  });
}

/** Persists a row's editor body to its own cache entry (mirrors documents). */
export function useUpdateDatagridRowContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDatagridRowContentInput) =>
      updateRow(input.id, { content: input.content }),
    onMutate: async (input: UpdateDatagridRowContentInput) => {
      const key = datagridRowContentKey(input.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Json>(key);
      qc.setQueryData<Json>(key, input.content);
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context) qc.setQueryData(context.key, context.previous);
      toast.error("Couldn't save changes");
    },
  });
}
