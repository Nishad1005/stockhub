import type { ReactNode } from "react";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-brand-line rounded-xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">{title}</h2>
      {children}
    </section>
  );
}
