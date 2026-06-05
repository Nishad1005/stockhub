export interface SplashProps {
  message?: string;
}

/** Full-screen brand-styled loading state. */
export function Splash({ message = "Loading…" }: SplashProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink">
      <div className="text-xs font-bold uppercase tracking-widest text-brand-mute mb-3">
        U&amp;M StockHub
      </div>
      <div className="h-6 w-6 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
      <p className="mt-3 text-sm text-brand-mute">{message}</p>
    </div>
  );
}
