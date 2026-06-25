import type { ReactNode } from "react";

export type BadgeTone = "ok" | "warn" | "bad" | "neutral";

const TONE: Record<BadgeTone, string> = {
  ok: "bg-brand-ok/15 text-brand-ok",
  warn: "bg-brand-warn/15 text-brand-warn",
  bad: "bg-brand-bad/15 text-brand-bad",
  neutral: "bg-brand-accent-soft text-brand-mute",
};
const DOT: Record<BadgeTone, string> = {
  ok: "bg-brand-ok", warn: "bg-brand-warn", bad: "bg-brand-bad", neutral: "bg-brand-mute",
};

export function badgeClasses(tone: BadgeTone): string {
  return `inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full ${TONE[tone]}`;
}

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", dot, className = "", children }: BadgeProps) {
  return (
    <span className={`${badgeClasses(tone)} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT[tone]}`} />}
      {children}
    </span>
  );
}
