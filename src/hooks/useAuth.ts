import { useAuthStore } from "@/stores/auth";
import { useProfile } from "./useProfile";
import type { ProfileRow, UserRole } from "@/types/profile";

export interface UseAuthResult {
  status: ReturnType<typeof useAuthStore.getState>["status"];
  user: ReturnType<typeof useAuthStore.getState>["user"];
  session: ReturnType<typeof useAuthStore.getState>["session"];
  profile: ProfileRow | null;
  role: UserRole | null;
  isManager: boolean; // manager OR admin — i.e. can perform manager actions
  isAdmin: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * One-stop auth hook for screens: session status + role + sign in/out.
 * Combines the auth store (session) with the profile query (role).
 */
export function useAuth(): UseAuthResult {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const role = profile?.role ?? null;

  return {
    status,
    user,
    session,
    profile: profile ?? null,
    role,
    isManager: role === "manager" || role === "admin",
    isAdmin: role === "admin",
    profileLoading,
    signIn,
    signOut,
  };
}
