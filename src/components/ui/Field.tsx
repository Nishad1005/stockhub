import type { InputHTMLAttributes, ReactNode } from "react";

export function inputClasses(opts: { mono?: boolean; invalid?: boolean } = {}): string {
  return [
    "w-full rounded-xl border px-3 py-2.5 text-sm bg-white",
    "focus:outline-none focus:ring-2 focus:ring-brand-accent-2/30 focus:border-brand-accent-2",
    "read-only:bg-brand-cream",
    opts.invalid ? "border-brand-bad" : "border-brand-line",
    opts.mono ? "font-mono font-bold uppercase tracking-wide" : "",
  ].filter(Boolean).join(" ");
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean;
  invalid?: boolean;
}

export function Input({ mono, invalid, className = "", ...rest }: InputProps) {
  return <input className={`${inputClasses({ mono, invalid })} ${className}`} {...rest} />;
}

export interface LabelProps {
  required?: boolean;
  tone?: "mute" | "ok" | "bad";
  className?: string;
  children: ReactNode;
}

const LABEL_TONE = { mute: "text-brand-mute", ok: "text-brand-ok", bad: "text-brand-bad" } as const;

export function Label({ required, tone = "mute", className = "", children }: LabelProps) {
  return (
    <label className={`block text-xs font-semibold mb-1 ${LABEL_TONE[tone]} ${className}`}>
      {children}
      {required && <span className="text-brand-bad"> *</span>}
    </label>
  );
}
