import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToggleRolePermission } from "@/hooks/useToggleRolePermission";
import { PERMISSIONS, EDITABLE_ROLES, type PermissionKey } from "@/constants/permissions";
import type { UserRole } from "@/types/profile";

export function RolePermissionsEditor() {
  const { data: map } = useRolePermissions();
  const toggle = useToggleRolePermission();
  const has = (role: UserRole, key: PermissionKey) => map?.get(role)?.has(key) ?? false;

  return (
    <section className="bg-white border border-brand-line rounded-xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">Role permissions</h2>

      {EDITABLE_ROLES.map((role) => (
        <div key={role} className="mb-4 last:mb-0">
          <div className="text-sm font-semibold capitalize text-brand-ink mb-1">{role}</div>
          <ul className="space-y-1">
            {PERMISSIONS.map((p) => (
              <li key={p.key} className="flex items-center justify-between text-sm">
                <span className="text-brand-ink">{p.label}</span>
                <input
                  type="checkbox"
                  checked={has(role, p.key)}
                  disabled={toggle.isPending}
                  onChange={(e) => toggle.mutate({ role, permission: p.key, granted: e.target.checked })}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-2 rounded-lg bg-brand-accent-soft/40 p-2 text-xs text-brand-mute">
        <b className="capitalize text-brand-ink">admin</b> — full access (always on). User management stays admin-only.
      </div>
    </section>
  );
}
