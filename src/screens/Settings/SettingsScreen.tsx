import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "./Card";
import { ExportsCard } from "./ExportsCard";
import { AccessControlsCard } from "./AccessControlsCard";
import { DataCard } from "./DataCard";
import { MasterDataCard } from "./MasterDataCard";
import { AboutCard } from "./AboutCard";

export function SettingsScreen() {
  const { isAdmin, user, role, signOut } = useAuth();
  const { can } = usePermissions();
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>
      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {can("export_data") && <ExportsCard />}
        {can("change_settings") && <AccessControlsCard />}
        <DataCard />
        <MasterDataCard />
        {isAdmin && (
          <Card title="Team">
            <Link to="/users" className="block w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-center text-brand-ink">
              Manage users →
            </Link>
          </Card>
        )}
        <AboutCard />

        <Card title="Account">
          <div className="text-sm text-brand-ink">{user?.email}</div>
          {role && <div className="text-[11px] text-brand-mute capitalize mb-3">Role: {role}</div>}
          <button
            onClick={() => void signOut()}
            className="w-full rounded-lg border border-brand-bad text-brand-bad py-2 text-sm font-semibold"
          >
            Sign out
          </button>
        </Card>
      </main>
    </div>
  );
}
