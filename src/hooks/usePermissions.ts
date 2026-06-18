import { useAuth } from "./useAuth";
import { useRolePermissions } from "./useRolePermissions";
import { resolveCan, type PermMap } from "@/lib/permissions";
import type { PermissionKey } from "@/constants/permissions";

const EMPTY: PermMap = new Map();

/** Current user's permission checker. `can(key)` is UI-enforced. */
export function usePermissions() {
  const { role } = useAuth();
  const { data: map, isLoading } = useRolePermissions();
  return {
    isLoading,
    can: (perm: PermissionKey) => resolveCan(map ?? EMPTY, role, perm),
  };
}
