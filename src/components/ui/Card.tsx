import type { ReactNode } from "react";

export interface CardProps {
  onClick?: () => void;
  className?: string;
  children: ReactNode;
}

export function Card({ onClick, className = "", children }: CardProps) {
  const base = "bg-white rounded-2xl shadow-card";
  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} w-full text-left ${className}`}>
        {children}
      </button>
    );
  }
  return <div className={`${base} ${className}`}>{children}</div>;
}
