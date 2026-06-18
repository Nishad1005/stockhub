import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/profile";

export type UserListItem = Pick<ProfileRow, "id" | "email" | "full_name" | "role">;

export const usersKeys = { all: ["users"] as const };

async function fetchUsers(): Promise<UserListItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .order("email");
  if (error) throw error;
  return (data ?? []) as UserListItem[];
}

/** All user profiles (readable by any authenticated user per RLS). */
export function useUsers() {
  return useQuery({ queryKey: usersKeys.all, queryFn: fetchUsers });
}
