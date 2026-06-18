import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { MovementModal } from "./MovementModal";
import { StockLevels } from "./StockLevels";
import { MovementHistory } from "./MovementHistory";

export function StockScreen() {
  const [movement, setMovement] = useState<"IN" | "OUT" | null>(null);
  const [tab, setTab] = useState<"levels" | "history">("levels");
  const { can } = usePermissions();

  const seg = (active: boolean) =>
    `flex-1 rounded-lg py-1.5 text-sm font-semibold ${active ? "bg-brand-accent-2 text-white" : "text-brand-ink"}`;

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Stock</h1>
        <p className="text-sm text-brand-mute">Receive, issue, and track inventory</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {(can("stock_in") || can("stock_out")) && (
          <div className="flex gap-2">
            {can("stock_in") && <button onClick={() => setMovement("IN")} className="flex-1 rounded-xl bg-brand-ok text-white font-semibold py-3 text-sm">📥 Stock IN</button>}
            {can("stock_out") && <button onClick={() => setMovement("OUT")} className="flex-1 rounded-xl bg-brand-bad text-white font-semibold py-3 text-sm">📤 Stock OUT</button>}
          </div>
        )}

        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <button onClick={() => setTab("levels")} className={seg(tab === "levels")}>Stock levels</button>
          <button onClick={() => setTab("history")} className={seg(tab === "history")}>History</button>
        </div>

        <section className="bg-white border border-brand-line rounded-xl p-2">
          {tab === "levels" ? <StockLevels /> : <MovementHistory />}
        </section>
      </main>

      {movement && <MovementModal type={movement} onClose={() => setMovement(null)} />}
    </div>
  );
}
