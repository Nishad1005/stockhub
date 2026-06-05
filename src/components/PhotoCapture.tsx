import { useRef } from "react";
import { compressImage } from "@/lib/photo";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";

export interface PhotoCaptureProps {
  /** Compressed JPEG data-URL, or null. */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/** Camera/gallery photo with on-device compression — v0.1 handlePhotoFile. */
export function PhotoCapture({ value, onChange }: PhotoCaptureProps) {
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    try {
      const data = await compressImage(file);
      onChange(data);
      const kb = Math.round((data.length * 0.75) / 1024);
      toast(`Photo added (~${kb} KB)`, "ok");
    } catch (e) {
      toast("Photo error: " + errMessage(e), "err");
    }
  }

  function clear() {
    onChange(null);
    if (camRef.current) camRef.current.value = "";
    if (galRef.current) galRef.current.value = "";
  }

  return (
    <div>
      {value ? (
        <div className="relative">
          <img src={value} alt="capture" className="w-full max-h-48 object-cover rounded-lg" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 text-sm leading-none"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => camRef.current?.click()}
            className="flex-1 rounded-lg border border-brand-line py-2 text-sm text-brand-ink"
          >
            📷 Camera
          </button>
          <button
            type="button"
            onClick={() => galRef.current?.click()}
            className="flex-1 rounded-lg border border-brand-line py-2 text-sm text-brand-ink"
          >
            🖼 Gallery
          </button>
        </div>
      )}
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <input
        ref={galRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}
