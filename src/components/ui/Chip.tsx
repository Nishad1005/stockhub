import type { ButtonHTMLAttributes } from "react";

export function chipClasses(active: boolean): string {
  return [
    "px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap transition",
    active ? "bg-brand-accent-2 text-white border-brand-accent-2"
           : "bg-white text-brand-ink border-brand-line",
  ].join(" ");
}

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Chip({ active = false, className = "", children, ...rest }: ChipProps) {
  return (
    <button className={`${chipClasses(active)} ${className}`} {...rest}>
      {children}
    </button>
  );
}
