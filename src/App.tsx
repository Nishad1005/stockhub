import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/Toaster";
import { LoginScreen } from "@/screens/Login/LoginScreen";
import { CaptureScreen } from "@/screens/Capture/CaptureScreen";
import { ItemsScreen } from "@/screens/Items/ItemsScreen";
import { BarcodesScreen } from "@/screens/Barcodes/BarcodesScreen";
import { DashboardScreen } from "@/screens/Dashboard/DashboardScreen";
import { TransfersScreen } from "@/screens/Transfers/TransfersScreen";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
import { useAuth } from "@/hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

// Placeholder screens — replaced as each phase is built.
function Placeholder({ name }: { name: string }) {
  const { user, role, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6">
      <div className="text-xs font-bold uppercase tracking-widest text-brand-mute mb-2">
        U&amp;M StockHub v0.2
      </div>
      <h1 className="text-2xl font-bold mb-2">{name}</h1>
      <p className="text-sm text-brand-mute mb-4">
        Signed in as <b>{user?.email}</b>
        {role ? ` · ${role}` : ""}
      </p>
      <button
        onClick={() => void signOut()}
        className="rounded-lg border border-brand-line px-4 py-2 text-sm font-semibold text-brand-ink"
      >
        Sign out
      </button>
    </div>
  );
}

const protect = (el: ReactNode) => (
  <ProtectedRoute>
    <AppShell>{el}</AppShell>
  </ProtectedRoute>
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/" element={<Navigate to="/capture" replace />} />
            <Route path="/capture" element={protect(<CaptureScreen />)} />
            <Route path="/items" element={protect(<ItemsScreen />)} />
            <Route path="/transfers" element={protect(<TransfersScreen />)} />
            <Route path="/dashboard" element={protect(<DashboardScreen />)} />
            <Route path="/barcodes" element={protect(<BarcodesScreen />)} />
            <Route path="/settings" element={protect(<SettingsScreen />)} />
            <Route path="*" element={protect(<Placeholder name="404" />)} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
