/**
 * Photo capture helpers — compress on-device, then upload to Supabase Storage.
 * Spec (docs/migration/01-capture.md §6): max 1024×1024, JPEG q0.75, bucket
 * `entry-photos`, save the public URL in entries.photo_url.
 *
 * Requires a Storage bucket named `entry-photos` (user action — see README).
 * Capture works without photos; uploadEntryPhoto only runs when one is attached.
 */
import { supabase } from "@/lib/supabase";

export const ENTRY_PHOTO_BUCKET = "entry-photos";

export function compressImage(
  file: File,
  maxW = 1024,
  maxH = 1024,
  quality = 0.75,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("File read failed"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image load failed"));
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const scale = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(e.target?.result ?? "");
    };
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Upload a compressed data-URL photo; returns the public URL. */
export async function uploadEntryPhoto(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? "anon";
  const path = `${uid}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(ENTRY_PHOTO_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return supabase.storage.from(ENTRY_PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
