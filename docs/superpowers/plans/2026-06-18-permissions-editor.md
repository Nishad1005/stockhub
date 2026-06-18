# Granular Permissions Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin-editable per-role permissions that gate workflow actions in the UI, replacing the hardcoded `isManager` checks with a `can(permission)` check.

**Architecture:** A `role_permissions` table (granted pairs) → `useRolePermissions` builds a role→Set map → `usePermissions().can()` resolves it for the current user. A Role-permissions editor on the Users screen toggles pairs. UI-enforced only; DB security unchanged.

**Tech Stack:** React 18 + TS, TanStack Query v5, Supabase JS, Vitest.

Spec: `docs/superpowers/specs/2026-06-18-permissions-editor-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/constants/permissions.ts` | `PermissionKey`, `PERMISSIONS`, `EDITABLE_ROLES` |
| `src/lib/permissions.ts` (+ test) | `buildPermMap`, `resolveCan` |
| `supabase/migrations/0013_role_permissions.sql` | Table + RLS + seed *(user runs)* |
| `src/types/database.ts` (modify) | `role_permissions` types |
| `src/hooks/useRolePermissions.ts` / `usePermissions.ts` / `useToggleRolePermission.ts` | Read / resolve / toggle |
| `src/screens/Users/RolePermissionsEditor.tsx` | Matrix editor |
| `src/screens/Users/UsersScreen.tsx` (modify) | Mount editor |
| Refactor: `SettingsScreen`, `DashboardScreen`, `EditEntryModal`, `StockScreen`, `TransfersScreen`, `CaptureScreen`, `ItemDetailModal` | Swap to `can(...)` |

---

## Task 1: permissions catalogue + resolver

**Files:** Create `src/constants/permissions.ts`, `src/lib/permissions.ts`, Test `src/lib/permissions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/permissions.test.ts
import { describe, it, expect } from "vitest";
import { buildPermMap, resolveCan } from "./permissions";

const rows = [
  { role: "storekeeper" as const, permission: "capture" },
  { role: "storekeeper" as const, permission: "transfer" },
  { role: "manager" as const, permission: "unlock_entry" },
];

describe("buildPermMap", () => {
  it("groups granted permissions by role", () => {
    const m = buildPermMap(rows);
    expect([...(m.get("storekeeper") ?? [])].sort()).toEqual(["capture", "transfer"]);
    expect(m.get("manager")?.has("unlock_entry")).toBe(true);
  });
});

describe("resolveCan", () => {
  const m = buildPermMap(rows);
  it("admin can do anything", () => {
    expect(resolveCan(m, "admin", "delete_entry")).toBe(true);
  });
  it("null / pending can do nothing", () => {
    expect(resolveCan(m, null, "capture")).toBe(false);
    expect(resolveCan(m, "pending", "capture")).toBe(false);
  });
  it("non-admin follows the map", () => {
    expect(resolveCan(m, "storekeeper", "capture")).toBe(true);
    expect(resolveCan(m, "storekeeper", "unlock_entry")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: FAIL — "Failed to resolve import './permissions'".

- [ ] **Step 3: Create the catalogue**

```typescript
// src/constants/permissions.ts
export type PermissionKey =
  | "capture"
  | "transfer"
  | "stock_in"
  | "stock_out"
  | "edit_entry"
  | "delete_entry"
  | "export_data"
  | "unlock_entry"
  | "change_settings"
  | "view_alerts";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "capture", label: "Capture items" },
  { key: "transfer", label: "Transfer stock (Move)" },
  { key: "stock_in", label: "Stock IN (receive)" },
  { key: "stock_out", label: "Stock OUT (issue)" },
  { key: "edit_entry", label: "Edit entries" },
  { key: "delete_entry", label: "Delete entries" },
  { key: "export_data", label: "Export CSV" },
  { key: "unlock_entry", label: "Unlock locked entries" },
  { key: "change_settings", label: "Change access / edit-lock settings" },
  { key: "view_alerts", label: "See the manager Alerts panel" },
];

/** Roles whose permissions are editable (admin is locked to full access; pending has none). */
export const EDITABLE_ROLES = ["storekeeper", "manager"] as const;
```

- [ ] **Step 4: Create the resolver**

```typescript
// src/lib/permissions.ts
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/lib/permissions.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/constants/permissions.ts src/lib/permissions.ts src/lib/permissions.test.ts
git commit -m "feat(perms): permission catalogue + resolver"
```

---

## Task 2: migration + types

**Files:** Create `supabase/migrations/0013_role_permissions.sql`, Modify `src/types/database.ts`

- [ ] **Step 1: Create the migration**

```sql
-- supabase/migrations/0013_role_permissions.sql
-- Per-role workflow permissions (UI-enforced). A row = that role is granted that permission.
create table role_permissions (
  role       user_role not null,
  permission text not null,
  primary key (role, permission)
);
alter table role_permissions enable row level security;
create policy "Role perms readable" on role_permissions for select using (auth.role() = 'authenticated');
create policy "Role perms admin-write" on role_permissions for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

insert into role_permissions (role, permission) values
  ('storekeeper','capture'), ('storekeeper','transfer'), ('storekeeper','stock_in'),
  ('storekeeper','stock_out'), ('storekeeper','edit_entry'), ('storekeeper','export_data'),
  ('manager','capture'), ('manager','transfer'), ('manager','stock_in'), ('manager','stock_out'),
  ('manager','edit_entry'), ('manager','delete_entry'), ('manager','export_data'),
  ('manager','unlock_entry'), ('manager','change_settings'), ('manager','view_alerts'),
  ('admin','capture'), ('admin','transfer'), ('admin','stock_in'), ('admin','stock_out'),
  ('admin','edit_entry'), ('admin','delete_entry'), ('admin','export_data'),
  ('admin','unlock_entry'), ('admin','change_settings'), ('admin','view_alerts')
on conflict do nothing;
```

- [ ] **Step 2: Hand-add the types**

In `src/types/database.ts`, add to `Database["public"]["Tables"]` (place after the `profiles` table block):

```typescript
      role_permissions: {
        Row: {
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          permission: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          permission?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0013_role_permissions.sql src/types/database.ts
git commit -m "feat(perms): role_permissions table + types"
```

- [ ] **Step 5: USER STEP (out-of-band)** — owner runs `npx supabase db push` (applies 0013). Code already compiles against the hand-added types.

---

## Task 3: permission hooks

**Files:** Create `src/hooks/useRolePermissions.ts`, `src/hooks/usePermissions.ts`, `src/hooks/useToggleRolePermission.ts`

- [ ] **Step 1: Create `useRolePermissions`**

```tsx
// src/hooks/useRolePermissions.ts
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
```

- [ ] **Step 2: Create `usePermissions`**

```tsx
// src/hooks/usePermissions.ts
import { useAuth } from "./useAuth";
import { useRolePermissions } from "./useRolePermissions";
import { resolveCan } from "@/lib/permissions";
import type { PermissionKey } from "@/constants/permissions";

/** Current user's permission checker. `can(key)` is UI-enforced. */
export function usePermissions() {
  const { role } = useAuth();
  const { data: map, isLoading } = useRolePermissions();
  const empty = new Map();
  return {
    isLoading,
    can: (perm: PermissionKey) => resolveCan(map ?? empty, role, perm),
  };
}
```

- [ ] **Step 3: Create `useToggleRolePermission`**

```tsx
// src/hooks/useToggleRolePermission.ts
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
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useRolePermissions.ts src/hooks/usePermissions.ts src/hooks/useToggleRolePermission.ts
git commit -m "feat(perms): role-permission hooks"
```

---

## Task 4: refactor Settings + Dashboard

**Files:** Modify `src/screens/Settings/SettingsScreen.tsx`, `src/screens/Dashboard/DashboardScreen.tsx`

- [ ] **Step 1: Settings — gate Exports + Access Controls by permission**

In `src/screens/Settings/SettingsScreen.tsx`, add the import after the `useAuth` import:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

Replace:

```tsx
  const { isManager, isAdmin, user, role, signOut } = useAuth();
```

with:

```tsx
  const { isAdmin, user, role, signOut } = useAuth();
  const { can } = usePermissions();
```

Replace:

```tsx
        <ExportsCard />
        {isManager && <AccessControlsCard />}
```

with:

```tsx
        {can("export_data") && <ExportsCard />}
        {can("change_settings") && <AccessControlsCard />}
```

- [ ] **Step 2: Dashboard — gate the Alerts panel by `view_alerts`**

In `src/screens/Dashboard/DashboardScreen.tsx`, replace:

```tsx
import { useAuth } from "@/hooks/useAuth";
```

with:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

Replace:

```tsx
  const { isManager } = useAuth();
```

with:

```tsx
  const { can } = usePermissions();
```

Replace:

```tsx
        {isManager && (empties.length > 0 || discreps.length > 0) && (
```

with:

```tsx
        {can("view_alerts") && (empties.length > 0 || discreps.length > 0) && (
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Settings/SettingsScreen.tsx src/screens/Dashboard/DashboardScreen.tsx
git commit -m "feat(perms): gate Settings exports/access + Dashboard alerts"
```

---

## Task 5: refactor EditEntryModal

**Files:** Modify `src/screens/Items/EditEntryModal.tsx`

- [ ] **Step 1: Swap the auth check for permissions**

Replace:

```tsx
import { useAuth } from "@/hooks/useAuth";
```

with:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

Replace:

```tsx
  const { isManager } = useAuth();
```

with:

```tsx
  const { can } = usePermissions();
```

- [ ] **Step 2: Gate edit (fields/save) and the unlock button**

Replace:

```tsx
  const disabled = locked;
```

with:

```tsx
  const disabled = locked || !can("edit_entry");
```

Replace:

```tsx
            {isManager ? (
```

with:

```tsx
            {can("unlock_entry") ? (
```

- [ ] **Step 3: Gate the Delete button by `delete_entry`**

Replace:

```tsx
              <button onClick={() => setConfirmDelete(true)} className="rounded-lg border border-brand-bad text-brand-bad px-4 py-2 text-sm font-semibold">
                Delete
              </button>
```

with:

```tsx
              {can("delete_entry") && (
                <button onClick={() => setConfirmDelete(true)} className="rounded-lg border border-brand-bad text-brand-bad px-4 py-2 text-sm font-semibold">
                  Delete
                </button>
              )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Items/EditEntryModal.tsx
git commit -m "feat(perms): gate edit/delete/unlock in EditEntryModal"
```

---

## Task 6: refactor Stock + Transfers + Capture

**Files:** Modify `src/screens/Stock/StockScreen.tsx`, `src/screens/Transfers/TransfersScreen.tsx`, `src/screens/Capture/CaptureScreen.tsx`

- [ ] **Step 1: Stock — gate IN / OUT buttons**

In `src/screens/Stock/StockScreen.tsx`, add at the top of the imports:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

After `const [tab, setTab] = useState<"levels" | "history">("levels");` add:

```tsx
  const { can } = usePermissions();
```

Replace:

```tsx
        <div className="flex gap-2">
          <button onClick={() => setMovement("IN")} className="flex-1 rounded-xl bg-brand-ok text-white font-semibold py-3 text-sm">📥 Stock IN</button>
          <button onClick={() => setMovement("OUT")} className="flex-1 rounded-xl bg-brand-bad text-white font-semibold py-3 text-sm">📤 Stock OUT</button>
        </div>
```

with:

```tsx
        {(can("stock_in") || can("stock_out")) && (
          <div className="flex gap-2">
            {can("stock_in") && <button onClick={() => setMovement("IN")} className="flex-1 rounded-xl bg-brand-ok text-white font-semibold py-3 text-sm">📥 Stock IN</button>}
            {can("stock_out") && <button onClick={() => setMovement("OUT")} className="flex-1 rounded-xl bg-brand-bad text-white font-semibold py-3 text-sm">📤 Stock OUT</button>}
          </div>
        )}
```

- [ ] **Step 2: Transfers — gate New Transfer**

In `src/screens/Transfers/TransfersScreen.tsx`, add the import:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

After the first hook line inside `TransfersScreen` (`const { data: transfers = [], isLoading, error } = useTransfers();`) add:

```tsx
  const { can } = usePermissions();
```

Replace:

```tsx
            <button onClick={() => setShowNew(true)} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 py-1.5 text-sm">
              ＋ New Transfer
            </button>
```

with:

```tsx
            {can("transfer") && (
              <button onClick={() => setShowNew(true)} className="rounded-lg bg-brand-accent-2 text-white font-semibold px-3 py-1.5 text-sm">
                ＋ New Transfer
              </button>
            )}
```

- [ ] **Step 3: Capture — gate the whole screen**

In `src/screens/Capture/CaptureScreen.tsx`, add the import:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

After `const [scannerOpen, setScannerOpen] = useState(false);` add:

```tsx
  const { can, isLoading: permsLoading } = usePermissions();
```

Replace:

```tsx
        <ShelfCard onScanClick={() => setScannerOpen(true)} onApplyShelf={applyShelfWithToast} />
        {ready ? (
          <ItemForm activeZone={activeZone} submitting={createEntry.isPending} onSubmit={handleSubmit} />
        ) : (
          <p className="text-sm text-brand-mute text-center mt-8">
            Scan a shelf barcode to start capturing items.
          </p>
        )}
```

with:

```tsx
        {permsLoading ? null : !can("capture") ? (
          <p className="text-sm text-brand-mute text-center mt-8">
            You don't have permission to capture items.
          </p>
        ) : (
          <>
            <ShelfCard onScanClick={() => setScannerOpen(true)} onApplyShelf={applyShelfWithToast} />
            {ready ? (
              <ItemForm activeZone={activeZone} submitting={createEntry.isPending} onSubmit={handleSubmit} />
            ) : (
              <p className="text-sm text-brand-mute text-center mt-8">
                Scan a shelf barcode to start capturing items.
              </p>
            )}
          </>
        )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Stock/StockScreen.tsx src/screens/Transfers/TransfersScreen.tsx src/screens/Capture/CaptureScreen.tsx
git commit -m "feat(perms): gate stock/transfer/capture actions"
```

---

## Task 7: refactor ItemDetailModal

**Files:** Modify `src/screens/ItemDetail/ItemDetailModal.tsx`

- [ ] **Step 1: Add the permission check**

Add the import after the `itemDetail` import:

```tsx
import { usePermissions } from "@/hooks/usePermissions";
```

After `const [action, setAction] = useState<Action>(null);` add:

```tsx
  const { can } = usePermissions();
```

- [ ] **Step 2: Gate the item-level Stock IN button**

Replace:

```tsx
            <button onClick={() => setAction({ kind: "in" })} className="rounded-lg bg-brand-ok text-white font-semibold px-3 py-1.5 text-xs">📥 Stock IN</button>
```

with:

```tsx
            {can("stock_in") && <button onClick={() => setAction({ kind: "in" })} className="rounded-lg bg-brand-ok text-white font-semibold px-3 py-1.5 text-xs">📥 Stock IN</button>}
```

- [ ] **Step 3: Gate the per-location action buttons**

Replace:

```tsx
                  <button onClick={() => setAction({ kind: "transfer", entry: e })} className={actBtn}>Move</button>
                  <button onClick={() => setAction({ kind: "out", entry: e })} className={actBtn}>Out</button>
                  <button onClick={() => setAction({ kind: "edit", entry: e })} className={actBtn}>Edit</button>
```

with:

```tsx
                  {can("transfer") && <button onClick={() => setAction({ kind: "transfer", entry: e })} className={actBtn}>Move</button>}
                  {can("stock_out") && <button onClick={() => setAction({ kind: "out", entry: e })} className={actBtn}>Out</button>}
                  {can("edit_entry") && <button onClick={() => setAction({ kind: "edit", entry: e })} className={actBtn}>Edit</button>}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ItemDetail/ItemDetailModal.tsx
git commit -m "feat(perms): gate Item Detail actions"
```

---

## Task 8: Role permissions editor

**Files:** Create `src/screens/Users/RolePermissionsEditor.tsx`, Modify `src/screens/Users/UsersScreen.tsx`

- [ ] **Step 1: Create the editor**

```tsx
// src/screens/Users/RolePermissionsEditor.tsx
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
```

- [ ] **Step 2: Mount it on the Users screen**

In `src/screens/Users/UsersScreen.tsx`, add the import:

```tsx
import { RolePermissionsEditor } from "./RolePermissionsEditor";
```

Add `<RolePermissionsEditor />` as the last element inside `<main>` (after the "All users" `</section>`):

```tsx
        <RolePermissionsEditor />
      </main>
```

(Replace the existing `      </main>` that closes the Users `<main>` with the two lines above.)

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Users/RolePermissionsEditor.tsx src/screens/Users/UsersScreen.tsx
git commit -m "feat(perms): role permissions editor on Users screen"
```

---

## Task 9: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (60 existing + 4 new = 64).

---

## Done — manual verification (after the user runs migration 0013)

1. As **admin**, **Settings → Manage users → Role permissions**: per-role checklists for storekeeper & manager; admin shown as "full access".
2. **Uncheck** "Transfer stock" for **storekeeper** → a storekeeper no longer sees the **New Transfer** button or the **Move** action in Item Detail (after their next load).
3. **Uncheck** "Export CSV" for manager → the Exports card disappears from their Settings.
4. **Check** "Unlock locked entries" for storekeeper → they now get the Unlock button on locked entries.
5. **Admin** always sees every action regardless of the matrix; **manage users** stays admin-only.
6. A role with `capture` unchecked sees "You don't have permission to capture items" on the Capture tab.
