import { useUsers } from "@/hooks/useUsers";
import { useUpdateUserRole } from "@/hooks/useUpdateUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { RolePermissionsEditor } from "./RolePermissionsEditor";
import type { UserRole } from "@/types/profile";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ROLE_TONE } from "@/constants/roles";

const ROLES: UserRole[] = ["pending", "storekeeper", "manager", "admin"];

export function UsersScreen() {
  const { data: users = [], isLoading } = useUsers();
  const { user, isAdmin } = useAuth();
  const update = useUpdateUserRole();

  async function setRole(id: string, role: UserRole) {
    try {
      await update.mutateAsync({ id, role });
      toast("Role updated", "ok");
    } catch (e) {
      toast("Failed: " + errMessage(e), "warn");
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
        <h1 className="text-xl font-bold mb-2">Admins only</h1>
        <p className="text-sm text-brand-mute">User management needs admin access.</p>
      </div>
    );
  }

  const pending = users.filter((u) => u.role === "pending");
  const others = users.filter((u) => u.role !== "pending");
  const select = "rounded-lg border border-brand-line px-2 py-1 text-sm disabled:opacity-50";

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink">
      <ScreenHeader
        title="Users"
        subtitle={`${users.length} user${users.length === 1 ? "" : "s"}`}
      />

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {isLoading && <p className="text-sm text-brand-mute text-center mt-8">Loading…</p>}

        {pending.length > 0 && (
          <Card className="border-2 border-brand-warn/50 p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-warn mb-2">
              Pending approvals ({pending.length})
            </h2>
            <ul className="space-y-2">
              {pending.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                    <div className="text-[11px] text-brand-mute truncate">{u.email}</div>
                  </div>
                  <select
                    className={select}
                    defaultValue=""
                    onChange={(e) => e.target.value && setRole(u.id, e.target.value as UserRole)}
                  >
                    <option value="" disabled>Approve as…</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brand-mute mb-2">All users</h2>
          <ul className="divide-y divide-brand-line">
            {others.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <li key={u.id} className="py-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {u.full_name || u.email}
                      {isSelf && <span className="ml-1 text-[10px] text-brand-mute">(you)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-brand-mute truncate">{u.email}</span>
                      <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </div>
                  </div>
                  <select
                    className={select}
                    value={u.role}
                    disabled={isSelf || update.isPending}
                    onChange={(e) => setRole(u.id, e.target.value as UserRole)}
                  >
                    {ROLES.filter((r) => r !== "pending").map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        </Card>

        <RolePermissionsEditor />
      </main>
    </div>
  );
}
