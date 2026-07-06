import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Clock } from "@/components/ui/icons";

export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
      <Clock className="w-8 h-8 text-brand-warn mb-3" />
      <h1 className="text-xl font-bold mb-2">Waiting for approval</h1>
      <p className="text-sm text-brand-mute max-w-xs">
        Your account (<b>{user?.email}</b>) is created but needs an admin to grant access. You'll be able to use Golai once approved.
      </p>
      <Button variant="secondary" onClick={() => void signOut()} className="mt-6">
        Sign out
      </Button>
    </div>
  );
}
