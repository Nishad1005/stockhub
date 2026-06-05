import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import type { ProfileRow } from "@/types/profile";

export const profileKeys = {
  byUser: (uid: string) => ["profile", uid] as const,
};

/** The signed-in user's profile row (role, name, …). Server data → React Query. */
export function useProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: user ? profileKeys.byUser(user.id) : ["profile", "anonymous"],
    enabled: !!user,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ProfileRow> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as ProfileRow;
    },
  });
}
