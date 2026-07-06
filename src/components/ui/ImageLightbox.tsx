import { useEffect } from "react";

export interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/** Simplest full-viewport image view: dark overlay, centered image, tap/Esc to close. */
export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
    >
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
    </div>
  );
}
