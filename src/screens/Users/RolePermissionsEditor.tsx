import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToggleRolePermission } from "@/hooks/useToggleRolePermission";
import { PERMISSIONS, EDITABLE_ROLES, type PermissionKey } from "@/constants/permissions";
import type { UserRole } from "@/types/profile";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  pending: "warn",
  storekeeper: "neutral",
  manager: "ok",
  admin: "bad",
};

export function RolePermissionsEditor() {
  const { data: map } = useRolePermissions();
  const toggle = useToggleRolePermission();
  const has = (role: UserRole, key: PermissionKey) => map?.get(role)?.has(key) ?? false;

  return (
    <Card className="p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-3">Role permissions</h2>

      {EDITABLE_ROLES.map((role) => (
        <div key={role} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge tone={ROLE_TONE[role]} className="capitalize">{role}</Badge>
          </div>
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
        <Badge tone="bad" className="capitalize">admin</Badge>
        {" "}— full access (always on). User management stays admin-only.
      </div>
    </Card>
  );
}
