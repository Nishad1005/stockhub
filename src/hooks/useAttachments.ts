import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/photo";
import { CURRENT_TENANT_ID } from "@/constants/tenant";
import { useAuthStore } from "@/stores/auth";
import type { Database } from "@/types/database";

export type AttachmentRow = Database["public"]["Tables"]["attachments"]["Row"];
type AttachmentInsert = Database["public"]["Tables"]["attachments"]["Insert"];

/**
 * Storage bucket for Aksure file attachments. It MUST be created manually in the
 * Supabase dashboard — same owner-provisioned pattern as `entry-photos`
 * (see docs/SYSTEM-REFERENCE.md §12; no migration creates a Storage bucket).
 */
export const AKSURE_ATTACHMENTS_BUCKET = "aksure-attachments";

export const attachmentsKeys = {
  list: (entityType: string, entityId: string | null) =>
    ["attachments", entityType, entityId] as const,
};

/** Fetch the attachments for one entity, newest first. */
export async function fetchAttachments(
  entityType: string,
  entityId: string,
): Promise<AttachmentRow[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AttachmentRow[];
}

/** data-URL → Blob (mirrors lib/photo.ts; that file's helper is private to it). */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function shortFileType(file: File, isImage: boolean): string {
  if (isImage) return "photo";
  if (file.type === "application/pdf") return "pdf";
  return "doc";
}

/**
 * Attachments for a single entity (polymorphic — `entityType` is e.g. 'grn',
 * 'dispatch', 'qc_hold'). Used by every Aksure module to attach photos/PDFs/docs.
 *
 * - The query is skipped while `entityId` is null (nothing to attach to yet).
 * - `addAttachment(file)` compresses images via the existing lib/photo.ts pipeline,
 *   uploads to the `aksure-attachments` bucket, then inserts an `attachments` row.
 * - `removeAttachment(id)` deletes the row only (not the Storage object — matches the
 *   entries delete pattern).
 */
export function useAttachments(entityType: string, entityId: string | null) {
  const qc = useQueryClient();
  const key = attachmentsKeys.list(entityType, entityId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchAttachments(entityType, entityId as string),
    enabled: entityId !== null,
  });

  const addMutation = useMutation<AttachmentRow, Error, File>({
    mutationFn: async (file) => {
      if (entityId === null) {
        throw new Error("Cannot attach a file before the entity exists.");
      }
      const uid = useAuthStore.getState().user?.id;
      if (!uid) throw new Error("You must be signed in to add an attachment.");

      const isImage = file.type.startsWith("image/");
      let blob: Blob;
      let contentType: string;
      if (isImage) {
        const dataUrl = await compressImage(file); // existing lib/photo.ts pipeline
        blob = dataUrlToBlob(dataUrl);
        contentType = "image/jpeg";
      } else {
        blob = file;
        contentType = file.type || "application/octet-stream";
      }

      const path = `${uid}/${crypto.randomUUID()}`;
      const { error: uploadError } = await supabase.storage
        .from(AKSURE_ATTACHMENTS_BUCKET)
        .upload(path, blob, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const fileUrl = supabase.storage
        .from(AKSURE_ATTACHMENTS_BUCKET)
        .getPublicUrl(path).data.publicUrl;

      const row: AttachmentInsert = {
        tenant_id: CURRENT_TENANT_ID,
        entity_type: entityType,
        entity_id: entityId,
        file_url: fileUrl,
        file_type: shortFileType(file, isImage),
        created_by: uid,
      };
      const { data, error } = await supabase
        .from("attachments")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data as AttachmentRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      // Deletes the attachments row only, not the Storage object (matches entries).
      const { error } = await supabase.from("attachments").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return {
    attachments: query.data ?? [],
    isLoading: query.isLoading,
    addAttachment: addMutation.mutate,
    removeAttachment: removeMutation.mutate,
    isUploading: addMutation.isPending,
  };
}
