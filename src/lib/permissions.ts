import type { UserRole } from "@/types/profile";

export type PermMap = Map<UserRole, Set<string>>;

/** Rows of granted (role, permission) pairs → role → granted permission set. */
export function buildPermMap(rows: ReadonlyArray<{ role: UserRole; permission: string }>): PermMap {
  const map: PermMap = new Map();
  for (const r of rows) {
    let set = map.get(r.role);
    if (!set) {
      set = new Set();
      map.set(r.role, set);
    }
    set.add(r.permission);
  }
  return map;
}

/** Whether a role may perform a permission. Admin always can; null/pending never. */
export function resolveCan(map: PermMap, role: UserRole | null, perm: string): boolean {
  if (role === "admin") return true;
  if (!role) return false;
  return map.get(role)?.has(perm) ?? false;
}
