import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-accent-2 text-white shadow-btn",
  secondary: "bg-white text-brand-ink border border-brand-line",
  ghost: "bg-transparent text-brand-accent-2",
  danger: "bg-white text-brand-bad border border-brand-bad/30",
};
const SIZE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

export function buttonClasses(variant: ButtonVariant, size: ButtonSize, fullWidth?: boolean): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    VARIANT[variant],
    SIZE[size],
    fullWidth ? "w-full" : "",
  ].filter(Boolean).join(" ");
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary", size = "md", icon, loading, fullWidth,
  disabled, className = "", children, ...rest
}: ButtonProps) {
  return (
    <button
      className={`${buttonClasses(variant, size, fullWidth)} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
