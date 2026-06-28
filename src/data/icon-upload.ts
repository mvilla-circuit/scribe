import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

import { requireUserId } from "./crud";

// Allowed image types and max size for a user-uploaded page icon. Kept small:
// icons render at tiny sizes, so there's no reason to accept large files.
const ICON_UPLOAD_MAX_BYTES = 1024 * 1024; // 1 MB
const ICON_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

/**
 * Uploads a custom page icon to the `page-icons` storage bucket under the
 * owner's folder and returns its public URL. The IconPicker stores that URL on
 * the document as an `image` icon.
 */
export function useUploadIcon() {
  const { session } = useAuth();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      const userId = requireUserId(session);

      const ext = ICON_UPLOAD_TYPES[file.type];
      if (!ext) throw new Error("Unsupported image type");
      if (file.size > ICON_UPLOAD_MAX_BYTES) {
        throw new Error("Image must be under 1 MB");
      }

      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("page-icons")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("page-icons").getPublicUrl(path);
      return data.publicUrl;
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Couldn't upload icon",
      );
    },
  });
}
