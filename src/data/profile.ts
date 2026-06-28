import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FontMap } from "@/fonts/catalog";
import { useAuth } from "@/lib/auth";
import type { Json, Tables } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

import { optimisticObjectHandlers } from "./optimistic-list";

/** A single row from the `profiles` table. */
export type Profile = Tables<"profiles">;

/**
 * The global role -> fontId map persisted in profiles.fonts. An empty map means
 * "use the System defaults", preserving the pre-Phase-6 look until the user
 * picks fonts in Settings.
 */
export type ProfileFonts = FontMap;

const profileKey = ["profile"] as const;

/** Query hook for the signed-in user's profile row. */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: profileKey,
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      if (userId === undefined) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Typed view of the profiles.fonts jsonb column. */
export function profileFonts(
  profile: Profile | null | undefined,
): ProfileFonts {
  const fonts = profile?.fonts;
  if (!fonts || typeof fonts !== "object" || Array.isArray(fonts)) return {};
  // The jsonb column is untrusted: keep only entries whose value is a string
  // (a fontId), never leaking non-string values to consumers.
  const result: Record<string, string> = {};
  for (const [role, value] of Object.entries(fonts)) {
    if (typeof value === "string") result[role] = value;
  }
  return result;
}

/**
 * Writes the whole global role -> fontId map (callers merge with the current map
 * before saving). Optimistic so the reading surface restyles instantly.
 */
export function useUpdateProfileFonts() {
  const qc = useQueryClient();
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (fonts: ProfileFonts) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({ fonts: fonts })
        .eq("id", userId);
      if (error) throw error;
    },
    ...optimisticObjectHandlers<Profile, ProfileFonts>({
      qc,
      key: profileKey,
      update: (prev, fonts) =>
        prev ? { ...prev, fonts: fonts as Json } : prev,
      errorMessage: "Couldn't save fonts",
    }),
  });
}
