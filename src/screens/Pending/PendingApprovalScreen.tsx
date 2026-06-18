import { useAuth } from "@/hooks/useAuth";

export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
      <div className="text-3xl mb-3">⏳</div>
      <h1 className="text-xl font-bold mb-2">Waiting for approval</h1>
      <p className="text-sm text-brand-mute max-w-xs">
        Your account (<b>{user?.email}</b>) is created but needs an admin to grant access. You'll be able to use StockHub once approved.
      </p>
      <button onClick={() => void signOut()} className="mt-6 rounded-lg border border-brand-line px-4 py-2 text-sm font-semibold">
        Sign out
      </button>
    </div>
  );
}
