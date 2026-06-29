import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/profile";
import { PendingApprovalScreen } from "@/screens/Pending/PendingApprovalScreen";
import { Splash } from "./Splash";

export interface ProtectedRouteProps {
  children: ReactNode;
  /** If set, the user's role must be one of these (else "not authorized"). */
  allowedRoles?: UserRole[];
}

/** Gates a route behind authentication (and optionally a role). */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  const { role, profileLoading } = useAuth();

  if (status === "loading") return <Splash />;
  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profileLoading) return <Splash message="Loading…" />;
  if (role === "pending") return <PendingApprovalScreen />;

  // 'security' is locked to the gate screen; everyone else is locked OUT of /gate.
  if (role === "security" && location.pathname !== "/gate") {
    return <Navigate to="/gate" replace />;
  }
  if (role !== "security" && location.pathname === "/gate") {
    return <Navigate to="/capture" replace />;
  }

  if (allowedRoles) {
    if (profileLoading) return <Splash message="Checking access…" />;
    if (!role || !allowedRoles.includes(role)) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
          <h1 className="text-xl font-bold mb-2">Not authorized</h1>
          <p className="text-sm text-brand-mute">
            This area needs {allowedRoles.join(" or ")} access.
          </p>
        </div>
      );
    }
  }

  return <>{children}</>;
}
