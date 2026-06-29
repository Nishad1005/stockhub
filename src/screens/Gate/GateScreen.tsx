import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { LogOut, Plus } from "@/components/ui/icons";
import { GateEntryForm } from "./GateEntryForm";
import { GateConfirmation, type GateConfirmationData } from "./GateConfirmation";
import { GateEntriesList } from "./GateEntriesList";

type View = "form" | "confirmation" | "list";

/**
 * Security gate-entry screen (route /gate). Full-screen, no tab bar — security
 * users are locked to this route by ProtectedRoute. Inner view is local state,
 * so refreshing /gate always lands on the empty form.
 */
export function GateScreen() {
  const { signOut } = useAuth();
  const [view, setView] = useState<View>("form");
  const [confirmation, setConfirmation] = useState<GateConfirmationData | null>(null);

  if (view === "confirmation" && confirmation) {
    return (
      <GateConfirmation
        data={confirmation}
        onNext={() => {
          setConfirmation(null);
          setView("form");
        }}
        onViewList={() => {
          setConfirmation(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink pb-10">
      <ScreenHeader
        title="Gate entry"
        subtitle="Security · Store Tanawada"
        action={
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className="w-9 h-9 flex items-center justify-center rounded-full text-brand-mute hover:bg-brand-accent-soft"
          >
            <LogOut className="w-5 h-5" />
          </button>
        }
      />

      <main className="px-4 max-w-md mx-auto space-y-4">
        {view === "list" ? (
          <>
            <Button fullWidth icon={<Plus className="w-4 h-4" />} onClick={() => setView("form")}>
              Log new vehicle entry
            </Button>
            <GateEntriesList />
          </>
        ) : (
          <GateEntryForm
            onSuccess={(c) => {
              setConfirmation(c);
              setView("confirmation");
            }}
            onViewList={() => setView("list")}
          />
        )}
      </main>
    </div>
  );
}
