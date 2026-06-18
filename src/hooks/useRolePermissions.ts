import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildPermMap, type PermMap } from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

export const rolePermissionsKeys = { all: ["role_permissions"] as const };

async function fetchPermMap(): Promise<PermMap> {
  const { data, error } = await supabase.from("role_permissions").select("role,permission");
  if (error) throw error;
  return buildPermMap((data ?? []) as { role: UserRole; permission: string }[]);
}

/** The role → granted-permissions map. */
export function useRolePermissions() {
  return useQuery({ queryKey: rolePermissionsKeys.all, queryFn: fetchPermMap });
}
