import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

import { requireUserId } from "./crud";

const COVER_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** MIME → file extension for covers we accept. */
const COVER_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Extension → MIME, for pickers that leave `File.type` empty (common for AVIF). */
const COVER_UPLOAD_EXTENSIONS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(COVER_UPLOAD_TYPES).map(([mime, ext]) => [ext, mime]),
  ),
  jpeg: "image/jpeg",
};

/** Comma-separated `accept` list for cover file inputs. */
export const COVER_IMAGE_ACCEPT = Object.keys(COVER_UPLOAD_TYPES).join(",");

const COVERS_PUBLIC_MARKER = "/object/public/covers/";

/**
 * Resolves a cover file's MIME type and extension from `File.type`. When the
 * browser leaves the type blank (or reports `application/octet-stream`), falls
 * back to the filename extension. A present but non-allowlisted MIME is never
 * overridden by the name — that would let a spoofed extension bypass the check.
 */
export function resolveCoverUploadType(
  file: File,
): { mime: string; ext: string } | null {
  const extFromMime = COVER_UPLOAD_TYPES[file.type];
  if (extFromMime) return { mime: file.type, ext: extFromMime };

  const typeMissing = !file.type || file.type === "application/octet-stream";
  if (!typeMissing) return null;

  const extKey = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (!extKey) return null;
  const mime = COVER_UPLOAD_EXTENSIONS[extKey];
  if (!mime) return null;
  const ext = COVER_UPLOAD_TYPES[mime];
  return ext ? { mime, ext } : null;
}

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
      const resolved = resolveCoverUploadType(file);
      if (!resolved) throw new Error("Unsupported image type");
      if (file.size === 0) {
        throw new Error("Image file is empty");
      }
      if (file.size > COVER_UPLOAD_MAX_BYTES) {
        throw new Error("Image must be under 10 MB");
      }

      // Typed Blob so storage always sees real bytes + contentType. Passing a
      // File whose `type` is blank (or AVIF on some WebViews) can make Supabase
      // Storage reject the multipart body as "No content provided".
      const body = file.slice(0, file.size, resolved.mime);

      const path = `${userId}/${crypto.randomUUID()}.${resolved.ext}`;
      const { error } = await supabase.storage
        .from("covers")
        .upload(path, body, { contentType: resolved.mime, upsert: false });
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
