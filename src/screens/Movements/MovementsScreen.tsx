import { useState } from "react";
import { TransfersScreen } from "@/screens/Transfers/TransfersScreen";
import { StockScreen } from "@/screens/Stock/StockScreen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Chip } from "@/components/ui/Chip";

/** Movements hub — Transfers + Stock under one Transfers/Stock toggle. */
export function MovementsScreen() {
  const [view, setView] = useState<"transfers" | "stock">("transfers");

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader title="Movements" subtitle="Transfers and stock in / out" />

      <div className="px-4 max-w-md mx-auto">
        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <Chip active={view === "transfers"} onClick={() => setView("transfers")} className="flex-1 rounded-lg justify-center">
            Transfers
          </Chip>
          <Chip active={view === "stock"} onClick={() => setView("stock")} className="flex-1 rounded-lg justify-center">
            Stock
          </Chip>
        </div>
      </div>

      {view === "transfers" ? <TransfersScreen /> : <StockScreen />}
    </div>
  );
}
