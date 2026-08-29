import { supabase } from "./supabase";

export const ASSET_BUCKET = "ad-assets";

export const MAX_ASSET_BYTES = 50 * 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

/** Uploads a background image/video to public Supabase Storage and returns its public URL. */
export async function uploadBackgroundAsset(file: File): Promise<UploadResult> {
  if (file.size > MAX_ASSET_BYTES) {
    return { ok: false, error: "File is larger than 50MB — please use a smaller clip." };
  }
  if (!/^(image|video)\//.test(file.type)) {
    return { ok: false, error: "Only image or video files can be used as backgrounds." };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return { ok: false, error: "Sign in again to upload media." };

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(ASSET_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });

  if (error) {
    return {
      ok: false,
      error:
        error.message.toLowerCase().includes("bucket")
          ? `Storage bucket "${ASSET_BUCKET}" is missing — run the setup SQL in Supabase.`
          : `Upload failed: ${error.message}`,
    };
  }

  const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) return { ok: false, error: "Could not resolve a public URL for the upload." };
  return { ok: true, url: data.publicUrl };
}
