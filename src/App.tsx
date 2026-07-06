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
import { MovementsScreen } from "@/screens/Movements/MovementsScreen";
import { SettingsScreen } from "@/screens/Settings/SettingsScreen";
import { SignUpScreen } from "@/screens/Login/SignUpScreen";
import { UsersScreen } from "@/screens/Users/UsersScreen";
import { GateScreen } from "@/screens/Gate/GateScreen";
import { OpenGrnsScreen } from "@/screens/Grn/OpenGrnsScreen";
import { GrnVerifyScreen } from "@/screens/Grn/GrnVerifyScreen";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/profile";

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
        U&amp;M Golai v0.2
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

const protect = (el: ReactNode, allowedRoles?: UserRole[]) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
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
            <Route path="/signup" element={<SignUpScreen />} />
            <Route path="/" element={<Navigate to="/capture" replace />} />
            <Route path="/capture" element={protect(<CaptureScreen />)} />
            <Route path="/items" element={protect(<ItemsScreen />)} />
            <Route path="/movements" element={protect(<MovementsScreen />)} />
            <Route path="/transfers" element={<Navigate to="/movements" replace />} />
            <Route path="/stock" element={<Navigate to="/movements" replace />} />
            <Route path="/dashboard" element={protect(<DashboardScreen />)} />
            <Route path="/barcodes" element={protect(<BarcodesScreen />)} />
            <Route path="/more" element={protect(<SettingsScreen />)} />
            <Route path="/settings" element={<Navigate to="/more" replace />} />
            <Route path="/users" element={protect(<UsersScreen />)} />
            <Route path="/grn" element={protect(<OpenGrnsScreen />, ["manager", "storekeeper", "admin"])} />
            <Route path="/grn/:grnId/verify" element={protect(<GrnVerifyScreen />, ["manager", "storekeeper", "admin"])} />
            {/* /gate is full-screen (no AppShell/tab bar); ProtectedRoute locks it to security */}
            <Route path="/gate" element={<ProtectedRoute><GateScreen /></ProtectedRoute>} />
            <Route path="*" element={protect(<Placeholder name="404" />)} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
