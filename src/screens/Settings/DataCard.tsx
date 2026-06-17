import { useEntries } from "@/hooks/useEntries";
import { useTransfers } from "@/hooks/useTransfers";
import { Card } from "./Card";

export function DataCard() {
  const { data: entries = [] } = useEntries();
  const { data: transfers = [] } = useTransfers();
  const withPhotos = entries.filter((e) => e.photo_url).length;
  return (
    <Card title="Data">
      <div className="text-sm leading-7 text-brand-ink">
        <div><b>Entries:</b> {entries.length}</div>
        <div><b>With photos:</b> {withPhotos}</div>
        <div><b>Transfers:</b> {transfers.length}</div>
      </div>
    </Card>
  );
}
