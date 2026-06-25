import { useEntries } from "@/hooks/useEntries";
import { useTransfers } from "@/hooks/useTransfers";
import { useMasterItems } from "@/hooks/useMasterItems";
import { ZONE_INDEX } from "@/constants/zones";
import { buildEntriesCsv, buildTransfersCsv, downloadCsv } from "@/lib/csv";
import { toast } from "@/stores/toast";
import type { EntryRow } from "@/types/entry";
import { Card } from "./Card";
import { Button } from "@/components/ui/Button";
import { Download } from "@/components/ui/icons";

const stamp = () => new Date().toISOString().slice(0, 10);

export function ExportsCard() {
  const { data: entries = [] } = useEntries();
  const { data: transfers = [] } = useTransfers();
  const { data: master = [] } = useMasterItems();

  function exportEntries() {
    if (!entries.length) {
      toast("Nothing to export", "warn");
      return;
    }
    const sectionByCode = new Map(master.map((m) => [m.code, m.section]));
    const csv = buildEntriesCsv(entries, {
      zoneName: (code) => ZONE_INDEX[code]?.name ?? code,
      section: (e: EntryRow) => (e.master_code ? sectionByCode.get(e.master_code) ?? "" : ""),
    });
    downloadCsv(`UM_StockHub_Entries_${stamp()}.csv`, csv);
    toast(`Exported ${entries.length} entries`, "ok");
  }

  function exportTransfers() {
    if (!transfers.length) {
      toast("Nothing to export", "warn");
      return;
    }
    downloadCsv(`UM_StockHub_Transfers_${stamp()}.csv`, buildTransfersCsv(transfers));
    toast(`Exported ${transfers.length} transfers`, "ok");
  }

  return (
    <Card title="Exports">
      <div className="space-y-2">
        <Button variant="secondary" size="md" fullWidth icon={<Download className="w-4 h-4" />} onClick={exportEntries}>
          Export entries CSV
        </Button>
        <Button variant="secondary" size="md" fullWidth icon={<Download className="w-4 h-4" />} onClick={exportTransfers}>
          Export transfers CSV
        </Button>
      </div>
      <p className="text-[11px] text-brand-mute mt-2">
        Opens in Excel. Photos stay in cloud storage (not bundled).
      </p>
    </Card>
  );
}
