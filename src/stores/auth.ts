/**
 * Auth store — the signed-in session (global client state, explicitly Zustand
 * territory per CLAUDE.md §6). The user's PROFILE (role, etc.) is server data and
 * lives in React Query via useProfile(), not here.
 *
 * Supabase persists the session itself (localStorage on web; Capacitor
 * Preferences on native — see lib/supabase.ts), so this just mirrors auth state
 * into the app and survives reloads.
 */
import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type AuthStatus = "loading" | "signed-in" | "signed-out";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  initialized: boolean;
  init: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function apply(set: (p: Partial<AuthState>) => void, session: Session | null) {
  set({
    session,
    user: session?.user ?? null,
    status: session ? "signed-in" : "signed-out",
  });
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  session: null,
  user: null,
  initialized: false,

  init: () => {
    if (get().initialized) return;
    set({ initialized: true });

    supabase.auth.getSession().then(({ data }) => apply(set, data.session));
    supabase.auth.onAuthStateChange((_event, session) => apply(set, session));
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error; // onAuthStateChange updates the store
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error; // handle_new_user creates a pending profile
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
}));
