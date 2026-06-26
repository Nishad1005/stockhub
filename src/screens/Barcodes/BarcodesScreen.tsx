import { useMemo, useState } from "react";
import { useEntries } from "@/hooks/useEntries";
import { entryNeedsCode } from "@/hooks/useAssignItemCode";
import { ItemBarcodes } from "./ItemBarcodes";
import { ShelfLabels } from "./ShelfLabels";
import { ShelfCoverage } from "./ShelfCoverage";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Chip } from "@/components/ui/Chip";

export function BarcodesScreen() {
  const { data: entries = [] } = useEntries();
  const needing = useMemo(() => entries.filter(entryNeedsCode), [entries]);
  const [tab, setTab] = useState<"items" | "shelf">("items");

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Barcodes"
        subtitle={`${entries.length} items · ${needing.length} need a code`}
      />

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <div className="flex gap-1 bg-brand-accent-soft/50 rounded-xl p-1">
          <Chip active={tab === "items"} onClick={() => setTab("items")} className="flex-1 rounded-lg justify-center">
            Item barcodes
          </Chip>
          <Chip active={tab === "shelf"} onClick={() => setTab("shelf")} className="flex-1 rounded-lg justify-center">
            Shelf labels
          </Chip>
        </div>

        {tab === "items" ? (
          <ItemBarcodes />
        ) : (
          <>
            <ShelfCoverage />
            <ShelfLabels />
          </>
        )}
      </main>
    </div>
  );
}
