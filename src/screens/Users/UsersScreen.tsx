import { useUsers } from "@/hooks/useUsers";
import { useUpdateUserRole } from "@/hooks/useUpdateUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
import { RolePermissionsEditor } from "./RolePermissionsEditor";
import type { UserRole } from "@/types/profile";

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
      <header className="px-4 pt-5 pb-2">
        <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M StockHub</div>
        <h1 className="text-xl font-bold">Users</h1>
        <p className="text-sm text-brand-mute">{users.length} user{users.length === 1 ? "" : "s"}</p>
      </header>

      <main className="px-4 pb-24 max-w-md mx-auto space-y-4">
        {isLoading && <p className="text-sm text-brand-mute text-center mt-8">Loading…</p>}

        {pending.length > 0 && (
          <section className="bg-white border-2 border-brand-warn/50 rounded-xl p-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-brand-warn mb-2">Pending approvals ({pending.length})</h2>
            <ul className="space-y-2">
              {pending.map((u) => (
                <li key={u.id} className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{u.full_name || u.email}</div>
                    <div className="text-[11px] text-brand-mute truncate">{u.email}</div>
                  </div>
                  <select className={select} defaultValue="" onChange={(e) => e.target.value && setRole(u.id, e.target.value as UserRole)}>
                    <option value="" disabled>Approve as…</option>
                    <option value="storekeeper">Storekeeper</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white border border-brand-line rounded-xl p-4">
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
                    <div className="text-[11px] text-brand-mute truncate">{u.email}</div>
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
        </section>

        <RolePermissionsEditor />
      </main>
    </div>
  );
}
