import { useAuth } from "@/hooks/useAuth";
import { ExportsCard } from "./ExportsCard";
import { AccessControlsCard } from "./AccessControlsCard";
import { DataCard } from "./DataCard";
import { MasterDataCard } from "./MasterDataCard";
import { AboutCard } from "./AboutCard";

export function SettingsScreen() {
  const { isManager } = useAuth();
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        <ExportsCard />
        {isManager && <AccessControlsCard />}
        <DataCard />
        <MasterDataCard />
        <AboutCard />
      </main>
    </div>
  );
}
