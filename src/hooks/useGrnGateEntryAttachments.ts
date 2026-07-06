import { useAttachments, type AttachmentRow } from "@/hooks/useAttachments";

/**
 * Display-only view of a gate entry's photos for the verification screen (a photo
 * strip). Thin wrapper over useAttachments so the read-only display intent is clear
 * at the call site — no add/remove; a Storekeeper cannot modify Security's photos.
 */
export function useGrnGateEntryAttachments(
  gateEntryId: string | null,
): { photos: AttachmentRow[]; isLoading: boolean } {
  const { attachments, isLoading } = useAttachments("grn_gate_entry", gateEntryId);
  const photos = attachments.filter(
    (a) => a.file_type === "photo" || a.file_type.startsWith("image/"),
  );
  return { photos, isLoading };
}
