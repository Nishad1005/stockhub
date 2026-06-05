import { useToastStore, type ToastType } from "@/stores/toast";

const STYLES: Record<ToastType, string> = {
  ok: "bg-brand-ok text-white",
  warn: "bg-brand-warn text-white",
  err: "bg-brand-bad text-white",
};

/** Renders active toasts. Mount once near the app root. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div className="fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-md w-full sm:w-auto rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg text-left ${STYLES[t.type]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
