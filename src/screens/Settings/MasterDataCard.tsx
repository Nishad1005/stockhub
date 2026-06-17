import { Card } from "./Card";

export function MasterDataCard() {
  return (
    <Card title="Master Data">
      <div className="text-sm leading-7 text-brand-ink">
        <div><b>Items:</b> <span className="font-mono">4,561</span></div>
        <div><b>Zones:</b> <span className="font-mono">11</span> (Z01–Z11)</div>
        <div><b>Categories:</b> <span className="font-mono">6</span></div>
        <div><b>Sections:</b> <span className="font-mono">13</span></div>
      </div>
      <p className="text-[11px] text-brand-mute mt-2">Re-seeded from the factory Stock_Analysis CSV.</p>
    </Card>
  );
}
