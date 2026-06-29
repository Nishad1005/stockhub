import { useNavigate, useParams } from "react-router-dom";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/** Placeholder for GRN Stage 2 (route /grn/:grnId/verify). Real verification ships in Sprint 2. */
export function GrnVerifyPlaceholder() {
  const { grnId } = useParams<{ grnId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader title="Verify GRN" />
      <main className="px-4 pb-24 max-w-md mx-auto">
        <Card className="p-6 text-center space-y-3">
          <div className="font-mono text-xs text-brand-mute break-all">GRN {grnId}</div>
          <p className="text-base font-semibold text-brand-ink">
            Stage 2 verification coming in Sprint 2
          </p>
          <Button variant="secondary" fullWidth onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </Card>
      </main>
    </div>
  );
}
