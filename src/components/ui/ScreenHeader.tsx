import type { ReactNode } from "react";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
}

export function ScreenHeader({ title, subtitle, eyebrow = "U&M StockHub", action }: ScreenHeaderProps) {
  return (
    <header className="px-4 pt-5 pb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] font-extrabold uppercase tracking-[1.5px] text-brand-mute">{eyebrow}</div>
        <h1 className="text-[22px] font-extrabold text-brand-ink leading-tight">{title}</h1>
        {subtitle != null && <p className="text-sm text-brand-mute">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
