import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { rolePermissionsKeys } from "./useRolePermissions";
import type { PermissionKey } from "@/constants/permissions";
import type { UserRole } from "@/types/profile";

/** Grant or revoke one (role, permission) pair. RLS restricts writes to admins. */
export function useToggleRolePermission() {
  const qc = useQueryClient();
  return useMutation<void, Error, { role: UserRole; permission: PermissionKey; granted: boolean }>({
    mutationFn: async ({ role, permission, granted }) => {
      if (granted) {
        const { error } = await supabase.from("role_permissions").insert({ role, permission });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role", role)
          .eq("permission", permission);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: rolePermissionsKeys.all }),
  });
}
