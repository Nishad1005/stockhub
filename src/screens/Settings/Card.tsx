import type { ReactNode } from "react";
import { Card as UiCard } from "@/components/ui/Card";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <UiCard className="p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">{title}</h2>
      {children}
    </UiCard>
  );
}
