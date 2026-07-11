import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

import { requireUserId } from "./crud";

const COVER_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const COVER_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const COVERS_PUBLIC_MARKER = "/object/public/covers/";

/**
 * Extracts the storage object path from a public `covers` URL, or null when the
 * URL is not one of ours (external / malformed).
 */
export function coverObjectPathFromPublicUrl(url: string): string | null {
  const index = url.indexOf(COVERS_PUBLIC_MARKER);
  if (index === -1) return null;
  const path = url.slice(index + COVERS_PUBLIC_MARKER.length);
  return path.length > 0 ? path : null;
}

/**
 * Best-effort delete of a previous cover object. Failures are ignored so a
 * missing or foreign URL never blocks the UI clear/replace path.
 */
export async function deleteCoverObject(url: string | null): Promise<void> {
  if (!url) return;
  const path = coverObjectPathFromPublicUrl(url);
  if (!path) return;
  try {
    await supabase.storage.from("covers").remove([path]);
  } catch {
    // Non-blocking: orphan cleanup must not surface to the writer.
  }
}

/**
 * Uploads a cover image to the `covers` storage bucket under the owner's folder
 * and returns its public URL for storing on a collection or document.
 */
export function useUploadCover() {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const userId = requireUserId(session);
      const ext = COVER_UPLOAD_TYPES[file.type];
      if (!ext) throw new Error("Unsupported image type");
      if (file.size > COVER_UPLOAD_MAX_BYTES) {
        throw new Error("Image must be under 10 MB");
      }

      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload cover",
      );
    },
  });
}
