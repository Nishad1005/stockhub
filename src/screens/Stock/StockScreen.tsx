import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { MovementModal } from "./MovementModal";
import { StockLevels } from "./StockLevels";
import { MovementHistory } from "./MovementHistory";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { ArrowDown, ArrowUp } from "lucide-react";

export function StockScreen() {
  const [movement, setMovement] = useState<"IN" | "OUT" | null>(null);
  const [tab, setTab] = useState<"levels" | "history">("levels");
  const { can } = usePermissions();

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Stock"
        subtitle="Receive, issue, and track inventory"
      />

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {(can("stock_in") || can("stock_out")) && (
          <div className="flex gap-2">
            {can("stock_in") && (
              <Button
                variant="primary"
                size="md"
                fullWidth
                icon={<ArrowDown className="w-4 h-4" />}
                onClick={() => setMovement("IN")}
                className="bg-brand-ok border-0"
              >
                Stock IN
              </Button>
            )}
            {can("stock_out") && (
              <Button
                variant="danger"
                size="md"
                fullWidth
                icon={<ArrowUp className="w-4 h-4" />}
                onClick={() => setMovement("OUT")}
                className="bg-brand-bad text-white border-0"
              >
                Stock OUT
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <Chip active={tab === "levels"} onClick={() => setTab("levels")} className="flex-1 rounded-lg justify-center">
            Stock levels
          </Chip>
          <Chip active={tab === "history"} onClick={() => setTab("history")} className="flex-1 rounded-lg justify-center">
            History
          </Chip>
        </div>

        <Card className="p-2">
          {tab === "levels" ? <StockLevels /> : <MovementHistory />}
        </Card>
      </main>

      {movement && <MovementModal type={movement} onClose={() => setMovement(null)} />}
    </div>
  );
}
