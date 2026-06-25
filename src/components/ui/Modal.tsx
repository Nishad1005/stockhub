import { useEffect, type ReactNode } from "react";
import { X } from "./icons";

export interface ModalProps {
  title?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function Modal({ title, onClose, footer, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[90vh] overflow-auto shadow-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-brand-line mx-auto mb-3" />
        {title != null && (
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand-ink text-base">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="text-brand-mute"><X className="w-5 h-5" /></button>
          </div>
        )}
        {children}
        {footer && <div className="flex gap-2 mt-4">{footer}</div>}
      </div>
    </div>
  );
}
