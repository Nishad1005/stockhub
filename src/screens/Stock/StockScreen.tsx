import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { MovementModal } from "./MovementModal";
import { StockLevels } from "./StockLevels";
import { MovementHistory } from "./MovementHistory";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { ArrowDown, ArrowUp } from "@/components/ui/icons";

export function StockScreen() {
  const [movement, setMovement] = useState<"IN" | "OUT" | null>(null);
  const [tab, setTab] = useState<"levels" | "history">("levels");
  const { can } = usePermissions();

  return (
    <>
      <main className="px-4 pb-24 pt-3 max-w-md mx-auto space-y-4">
        {(can("stock_in") || can("stock_out")) && (
          <div className="flex gap-2">
            {can("stock_in") && (
              <Button
                variant="ok"
                size="md"
                fullWidth
                icon={<ArrowDown className="w-4 h-4" />}
                onClick={() => setMovement("IN")}
              >
                Stock IN
              </Button>
            )}
            {can("stock_out") && (
              <Button
                variant="bad"
                size="md"
                fullWidth
                icon={<ArrowUp className="w-4 h-4" />}
                onClick={() => setMovement("OUT")}
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
    </>
  );
}
