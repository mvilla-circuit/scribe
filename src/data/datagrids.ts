import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Json, Tables, TablesUpdate } from "@/lib/database.types";
import type { DatagridField } from "@/lib/datagrid-schema";
import { supabase } from "@/lib/supabase";
import { asJsonObject } from "@/lib/utils";

import { execWrite, requireUserId } from "./crud";
import { type DatagridView, newDefaultViewRow } from "./datagrid-views";
import { coerceFontMap } from "./font-map";
import { listHandlers, patchById, removeById } from "./optimistic-list";
import { byPosition } from "./ordering";
import {
  datagridRowContentKey,
  datagridRowsKey,
  datagridsKey,
  datagridViewsKey,
} from "./query-keys";

/** A single row from the `datagrids` table (a collection-scoped database). */
export type Datagrid = Tables<"datagrids">;

/**
 * A datagrid's `theme` jsonb. `fonts` holds per-role overrides over global
 * settings; `showSubtitle` toggles the masthead subtitle slot (book parity).
 */
export interface DatagridTheme {
  fonts?: FontMap;
  showSubtitle?: boolean;
}

/** Typed view of the datagrids.theme jsonb column. */
export function datagridTheme(datagrid: Datagrid): DatagridTheme {
  return asJsonObject(datagrid.theme);
}

/** The datagrid's per-role font overrides. */
export function datagridFontOverrides(datagrid: Datagrid): FontMap {
  return coerceFontMap(datagridTheme(datagrid).fonts);
}

/**
 * Whether the datagrid shows its subtitle slot. Defaults to true when a
 * subtitle already exists, otherwise hidden — same rule as books.
 */
export function datagridShowSubtitle(datagrid: Datagrid): boolean {
  const flag = datagridTheme(datagrid).showSubtitle;
  if (typeof flag === "boolean") return flag;
  return Boolean(datagrid.subtitle && datagrid.subtitle.trim().length > 0);
}

// The `fields` schema is a typed interface array; the jsonb column is `Json`.
// The two are structurally JSON-serializable but the interface lacks an index
// signature, so bridge them with a single assertion from `unknown`.
function asJson(value: unknown): Json {
  return value as Json;
}

/** Mutation input shapes, shared between each `mutationFn` and its updater. */
interface CreateDatagridInput {
  id: string;
  collection_id: string;
  name?: string;
  position: number;
  // Id for the default table view seeded alongside the datagrid, so the
  // optimistic view cache and the persisted row share one stable id.
  viewId: string;
}
interface RenameDatagridInput {
  id: string;
  name: string;
}
type UpdateDatagridInput = { id: string } & Partial<{
  name: string;
  icon: string | null;
  cover_url: string | null;
  subtitle: string | null;
  theme: DatagridTheme;
  /** Shallow-merged onto the latest cached theme (avoids stale full replaces). */
  themePatch: Partial<DatagridTheme>;
  fields: DatagridField[];
}>;
interface MoveDatagridInput {
  id: string;
  collection_id: string;
  position: number;
}
interface DeleteDatagridInput {
  id: string;
}

/** Query hook for all of the signed-in user's datagrids, ordered by position. */
export function useDatagrids() {
  return useQuery({
    queryKey: datagridsKey,
    queryFn: async (): Promise<Datagrid[]> => {
      const { data, error } = await supabase
        .from("datagrids")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []).slice().sort(byPosition);
    },
  });
}

// Patches a single datagrid by id. Backs rename/update/move so their mutationFns
// stay one-liners over a single typed Supabase call.
async function updateDatagridRow(id: string, patch: TablesUpdate<"datagrids">) {
  await execWrite(supabase.from("datagrids").update(patch).eq("id", id));
}

/**
 * Builds the full datagrid row for a freshly created datagrid. Both the Supabase
 * insert and the optimistic cache entry derive from this one place so the column
 * set can't drift; the insert drops the DB-managed timestamps and lets Postgres
 * default them.
 */
function newDatagridRow(input: CreateDatagridInput, userId: string): Datagrid {
  const now = new Date().toISOString();
  return {
    id: input.id,
    user_id: userId,
    collection_id: input.collection_id,
    name: input.name ?? "Untitled",
    icon: null,
    cover_url: null,
    subtitle: null,
    theme: {},
    fields: [],
    position: input.position,
    created_at: now,
    updated_at: now,
  };
}

// Builds the editable patch shared by the DB write and the optimistic cache
// update, translating the typed `fields` array into the jsonb column.
function toDatagridPatch(
  input: UpdateDatagridInput,
  currentTheme?: DatagridTheme,
): TablesUpdate<"datagrids"> {
  const patch: TablesUpdate<"datagrids"> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.icon !== undefined) patch.icon = input.icon;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url;
  if (input.subtitle !== undefined) patch.subtitle = input.subtitle;
  if (input.themePatch !== undefined) {
    patch.theme = asJson({ ...currentTheme, ...input.themePatch });
  } else if (input.theme !== undefined) {
    patch.theme = asJson(input.theme);
  }
  if (input.fields !== undefined) patch.fields = asJson(input.fields);
  return patch;
}

/**
 * Mutation hook that creates a datagrid and seeds its default table view in the
 * same action, so a new datagrid always opens with one usable view. The datagrid
 * is optimistically appended to the list and its views cache is seeded with the
 * default view under a stable id shared with the persisted row.
 */
export function useCreateDatagrid() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const handlers = listHandlers<Datagrid, CreateDatagridInput>({
    qc,
    key: datagridsKey,
    update: (prev, input) => [
      ...prev,
      newDatagridRow(input, requireUserId(session)),
    ],
    errorMessage: "Couldn't create datagrid",
  });
  return useMutation({
    mutationFn: async (input: CreateDatagridInput) => {
      const userId = requireUserId(session);
      const {
        created_at: _created,
        updated_at: _updated,
        ...row
      } = newDatagridRow(input, userId);
      await execWrite(supabase.from("datagrids").insert(row));
      const {
        created_at: _viewCreated,
        updated_at: _viewUpdated,
        ...viewRow
      } = newDefaultViewRow(
        { id: input.viewId, datagrid_id: input.id },
        userId,
      );
      try {
        await execWrite(supabase.from("datagrid_views").insert(viewRow));
      } catch (error) {
        // Compensating delete: leave no orphan grid if the default view fails.
        // If this also fails, surface it — swallowing would hide a grid with no views.
        await execWrite(supabase.from("datagrids").delete().eq("id", input.id));
        throw error;
      }
    },
    ...handlers,
    onMutate: async (input: CreateDatagridInput) => {
      const userId = requireUserId(session);
      await qc.cancelQueries({ queryKey: datagridsKey });
      // Defensive: drop any in-flight views fetch for this id before seeding so
      // a late empty response can't clobber the optimistic default view.
      await qc.cancelQueries({ queryKey: datagridViewsKey(input.id) });
      const previous = qc.getQueryData<Datagrid[]>(datagridsKey);
      qc.setQueryData<Datagrid[]>(datagridsKey, (prev) =>
        [...(prev ?? []), newDatagridRow(input, userId)]
          .slice()
          .sort(byPosition),
      );
      // Seed the (per-datagrid) views cache so opening the new grid shows its
      // default view without a round-trip.
      qc.setQueryData(datagridViewsKey(input.id), [
        newDefaultViewRow({ id: input.viewId, datagrid_id: input.id }, userId),
      ]);
      return { previous };
    },
    onError: (error, input, context) => {
      handlers.onError(error, input, context);
      qc.removeQueries({ queryKey: datagridViewsKey(input.id) });
    },
    onSettled: (data, error, variables) => {
      handlers.onSettled?.(data, error, variables);
      // onError already cleared the views seed for a failed create — don't
      // refetch a grid that was rolled back.
      if (error) return;
      // Heal only when a racing empty GET wiped the optimistic seed. Unconditional
      // invalidate would refetch the still-table server row and clobber an
      // in-flight layout persist (e.g. optimistic gallery).
      const views = qc.getQueryData<DatagridView[]>(
        datagridViewsKey(variables.id),
      );
      if (views == null || views.length === 0) {
        void qc.invalidateQueries({
          queryKey: datagridViewsKey(variables.id),
        });
      }
    },
  });
}

/** Mutation hook that renames a datagrid. */
export function useRenameDatagrid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RenameDatagridInput) =>
      updateDatagridRow(input.id, { name: input.name }),
    ...listHandlers<Datagrid, RenameDatagridInput>({
      qc,
      key: datagridsKey,
      update: (prev, input) => patchById(prev, input.id, { name: input.name }),
      errorMessage: "Couldn't rename datagrid",
    }),
  });
}

/** Generic patch for a datagrid's editable metadata (name, icon, cover, subtitle, theme, fields). */
export function useUpdateDatagrid() {
  const qc = useQueryClient();
  return useMutation({
    // Serialize theme/field writes so overlapping patches land in order.
    scope: { id: "datagrid-update" },
    mutationFn: (input: UpdateDatagridInput) => {
      const latest = qc
        .getQueryData<Datagrid[]>(datagridsKey)
        ?.find((row) => row.id === input.id);
      return updateDatagridRow(
        input.id,
        toDatagridPatch(input, latest ? datagridTheme(latest) : {}),
      );
    },
    ...listHandlers<Datagrid, UpdateDatagridInput>({
      qc,
      key: datagridsKey,
      update: (prev, input) => {
        const current = prev.find((row) => row.id === input.id);
        return patchById(
          prev,
          input.id,
          toDatagridPatch(input, current ? datagridTheme(current) : {}),
        );
      },
      errorMessage: "Couldn't update datagrid",
    }),
  });
}

/** Mutation hook that moves a datagrid into a (possibly different) collection. */
export function useMoveDatagrid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MoveDatagridInput) =>
      updateDatagridRow(input.id, {
        collection_id: input.collection_id,
        position: input.position,
      }),
    ...listHandlers<Datagrid, MoveDatagridInput>({
      qc,
      key: datagridsKey,
      update: (prev, input) =>
        patchById(prev, input.id, {
          collection_id: input.collection_id,
          position: input.position,
        }),
      errorMessage: "Couldn't move datagrid",
    }),
  });
}

/**
 * Mutation hook that deletes a datagrid. Its views and rows cascade away in the
 * DB via their `ON DELETE CASCADE` FKs.
 */
export function useDeleteDatagrid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: DeleteDatagridInput) => {
      await execWrite(supabase.from("datagrids").delete().eq("id", input.id));
    },
    ...listHandlers<Datagrid, DeleteDatagridInput>({
      qc,
      key: datagridsKey,
      update: (prev, input) => removeById(prev, input.id),
      errorMessage: "Couldn't delete datagrid",
    }),
    onSuccess: async (_data, input) => {
      const viewsKey = datagridViewsKey(input.id);
      const rowsKey = datagridRowsKey(input.id);
      const rows = qc.getQueryData<{ id: string }[]>(rowsKey) ?? [];
      const childKeys = [
        viewsKey,
        rowsKey,
        ...rows.map((row) => datagridRowContentKey(row.id)),
      ];

      await Promise.all(
        childKeys.map((queryKey) => qc.cancelQueries({ queryKey })),
      );
      for (const queryKey of childKeys) {
        qc.removeQueries({ queryKey });
      }
    },
  });
}
