import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Json, Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { execWrite, requireUserId } from "./crud";
import { coerceFontMap } from "./font-map";
import { optimisticObjectHandlers } from "./optimistic-list";
import { profileKey } from "./query-keys";

/** A single row from the `profiles` table. */
export type Profile = Tables<"profiles">;

/**
 * The global role -> fontId map persisted in profiles.fonts. An empty map means
 * "use the System defaults", preserving the pre-Phase-6 look until the user
 * picks fonts in Settings.
 */
export type ProfileFonts = FontMap;

/** Query hook for the signed-in user's profile row. */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: profileKey,
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      if (userId === undefined) return null;
      // `maybeSingle` returns null (not a thrown PGRST116 error) when the
      // profile row hasn't been created yet, so consumers can fall back to
      // defaults gracefully.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

/** Typed view of the profiles.fonts jsonb column. */
export function profileFonts(
  profile: Profile | null | undefined,
): ProfileFonts {
  return coerceFontMap(profile?.fonts);
}

/**
 * Writes the whole global role -> fontId map (callers merge with the current map
 * before saving). Optimistic so the reading surface restyles instantly.
 */
export function useUpdateProfileFonts() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    // Upsert (not update): a brand-new user has no profile row yet, so a bare
    // `update` would silently affect zero rows and the font choice would be
    // lost. Upserting on the primary key inserts the row the first time and
    // patches it thereafter.
    mutationFn: async (fonts: ProfileFonts) => {
      const userId = requireUserId(session);
      await execWrite(
        supabase.from("profiles").upsert({ id: userId, fonts: fonts as Json }),
      );
    },
    ...optimisticObjectHandlers<Profile, ProfileFonts>({
      qc,
      key: profileKey,
      update: (prev, fonts) => {
        if (prev) return { ...prev, fonts: fonts as Json };
        // No cached row yet (first-ever font change): mint an optimistic one so
        // the reading surface restyles instantly. The settle-time refetch
        // replaces it with the real row, so the defaulted columns are transient.
        const userId = session?.user.id;
        if (!userId) return prev;
        const now = new Date().toISOString();
        return {
          id: userId,
          fonts: fonts as Json,
          default_font: null,
          display_name: null,
          theme: "system",
          created_at: now,
          updated_at: now,
        };
      },
      errorMessage: "Couldn't save fonts",
    }),
  });
}
