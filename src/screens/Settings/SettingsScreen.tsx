import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Card } from "./Card";
import { ExportsCard } from "./ExportsCard";
import { AccessControlsCard } from "./AccessControlsCard";
import { DataCard } from "./DataCard";
import { MasterDataCard } from "./MasterDataCard";
import { AboutCard } from "./AboutCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";

export function SettingsScreen() {
  const { isAdmin, user, role, signOut } = useAuth();
  const { can } = usePermissions();
  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader title="More" />
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
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </Card>
      </main>
    </div>
  );
}
