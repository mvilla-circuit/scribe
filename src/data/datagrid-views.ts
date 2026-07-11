import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import {
  type DatagridViewConfig,
  DEFAULT_DATAGRID_VIEW_CONFIG,
} from "@/lib/datagrid-schema";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import { listHandlers, patchById, removeById } from "./optimistic-list";
import { byPosition } from "./ordering";
import { datagridViewsKey } from "./query-keys";

/** A single saved view row from the `datagrid_views` table. */
export type DatagridView = Tables<"datagrid_views">;

// A view `config` is a typed interface; the jsonb column is `Json`. The two are
// structurally JSON-serializable but the interface lacks an index signature, so
// bridge them with a single assertion from `unknown`.
function asJson(value: unknown): Json {
  return value as Json;
}

/** Mutation input shapes, shared between each `mutationFn` and its updater. */
interface CreateDatagridViewInput {
  id: string;
  name?: string;
  config?: DatagridViewConfig;
  position: number;
  is_default?: boolean;
}
interface RenameDatagridViewInput {
  id: string;
  name: string;
}
type UpdateDatagridViewInput = { id: string; name?: string } & {
  config?: DatagridViewConfig;
};
interface DeleteDatagridViewInput {
  id: string;
}

/**
 * Builds the full view row for a freshly created view. A single source for both
 * the Supabase insert and the optimistic cache entry so their column sets can't
 * drift; the insert drops the DB-managed timestamps and lets Postgres default
 * them.
 */
function newViewRow(
  input: CreateDatagridViewInput,
  datagridId: string,
  userId: string,
): DatagridView {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    datagrid_id: datagridId,
    name: input.name ?? "Table",
    config: asJson(input.config ?? DEFAULT_DATAGRID_VIEW_CONFIG),
    position: input.position,
    is_default: input.is_default ?? false,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Builds the default table view seeded when a datagrid is first created, so a
 * new datagrid always opens with one usable (is_default) table view. Shared with
 * `useCreateDatagrid`, which persists it alongside the datagrid row.
 */
export function newDefaultViewRow(
  input: { id: string; datagrid_id: string; position?: number },
  userId: string,
): DatagridView {
  return newViewRow(
    {
      id: input.id,
      name: "Table",
      config: DEFAULT_DATAGRID_VIEW_CONFIG,
      position: input.position ?? 0,
      is_default: true,
    },
    input.datagrid_id,
    userId,
  );
}

/** Query hook for one datagrid's saved views, ordered by position. */
export function useDatagridViews(datagridId: string | null) {
  return useQuery({
    queryKey: datagridViewsKey(datagridId ?? ""),
    enabled: datagridId !== null,
    queryFn: async (): Promise<DatagridView[]> => {
      if (datagridId === null) return [];
      const { data, error } = await supabase
        .from("datagrid_views")
        .select("*")
        .eq("datagrid_id", datagridId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Patches a single view by id. Backs rename/update so their mutationFns stay
// one-liners over a single typed Supabase call.
async function updateViewRow(
  id: string,
  patch: TablesUpdate<"datagrid_views">,
) {
  await execWrite(supabase.from("datagrid_views").update(patch).eq("id", id));
}

/** Mutation hook that creates a saved view for a datagrid. */
export function useCreateDatagridView(datagridId: string) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const key = datagridViewsKey(datagridId);
  return useMutation({
    mutationFn: async (input: CreateDatagridViewInput) => {
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newViewRow(input, datagridId, requireUserId(session));
      await execWrite(supabase.from("datagrid_views").insert(row));
    },
    ...listHandlers<DatagridView, CreateDatagridViewInput>({
      qc,
      key,
      update: (prev, input) => [
        ...prev,
        newViewRow(input, datagridId, requireUserId(session)),
      ],
      errorMessage: "Couldn't create view",
    }),
  });
}

/** Mutation hook that renames a view. */
export function useRenameDatagridView(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridViewsKey(datagridId);
  return useMutation({
    mutationFn: (input: RenameDatagridViewInput) =>
      updateViewRow(input.id, { name: input.name }),
    ...listHandlers<DatagridView, RenameDatagridViewInput>({
      qc,
      key,
      update: (prev, input) => patchById(prev, input.id, { name: input.name }),
      errorMessage: "Couldn't rename view",
    }),
  });
}

/** Mutation hook that patches a view's editable fields (name and/or config). */
export function useUpdateDatagridView(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridViewsKey(datagridId);
  return useMutation({
    scope: { id: `datagrid-view:${datagridId}` },
    mutationFn: (input: UpdateDatagridViewInput) => {
      const patch: TablesUpdate<"datagrid_views"> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.config !== undefined) patch.config = asJson(input.config);
      return updateViewRow(input.id, patch);
    },
    ...listHandlers<DatagridView, UpdateDatagridViewInput>({
      qc,
      key,
      update: (prev, input) => {
        const patch: Partial<DatagridView> = {};
        if (input.name !== undefined) patch.name = input.name;
        if (input.config !== undefined) patch.config = asJson(input.config);
        return patchById(prev, input.id, patch);
      },
      errorMessage: "Couldn't update view",
    }),
  });
}

/** Mutation hook that deletes a view. */
export function useDeleteDatagridView(datagridId: string) {
  const qc = useQueryClient();
  const key = datagridViewsKey(datagridId);
  return useMutation({
    mutationFn: async (input: DeleteDatagridViewInput) => {
      await execWrite(
        supabase.from("datagrid_views").delete().eq("id", input.id),
      );
    },
    ...listHandlers<DatagridView, DeleteDatagridViewInput>({
      qc,
      key,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete view",
    }),
  });
}
