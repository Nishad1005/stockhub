# Granular Permissions Editor — Design Spec

Status: **approved** · Date: 2026-06-18 · Per-role, UI-enforced.

---

## 1. Goal

Let admins control **which workflow actions each role can perform** via an editable
Role → Permission matrix, replacing the hardcoded `isManager` checks. Enforcement is in the UI
(buttons/actions appear only when permitted); the hard security boundaries already in the DB
(pending lockout, admin-only role changes) are unchanged.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Granularity | **Per role** (storekeeper / manager / admin). |
| Enforcement | **UI-enforced** via a `can(permission)` check; RLS unchanged. |
| `manage_users` / role changes | **Hard admin-only** (RLS + guard trigger) — *not* a toggle. |
| Admin row | **Always all permissions** (locked on; prevents lockout). |
| Editor location | **"Role permissions" section on the Users screen** (admin), as per-role checklists. |
| Storage | `role_permissions(role, permission)` table; granted = row present. |

## 3. Permission catalogue

`src/constants/permissions.ts` — the canonical, fixed list (`PermissionKey` union + labels):

| Key | Label |
|-----|-------|
| `capture` | Capture items |
| `transfer` | Transfer stock (Move) |
| `stock_in` | Stock IN (receive) |
| `stock_out` | Stock OUT (issue) |
| `edit_entry` | Edit entries |
| `delete_entry` | Delete entries |
| `export_data` | Export CSV |
| `unlock_entry` | Unlock locked entries |
| `change_settings` | Change access / edit-lock settings |
| `view_alerts` | See the manager Alerts panel |

`manage_users` is intentionally **excluded** (hard admin-only). `pending` has no permissions.

## 4. Data model & resolution

### Table — migration `0013_role_permissions.sql` (user runs)
```sql
create table role_permissions (
  role       user_role not null,
  permission text not null,
  primary key (role, permission)
);
alter table role_permissions enable row level security;
create policy "Role perms readable" on role_permissions for select using (auth.role() = 'authenticated');
create policy "Role perms admin-write" on role_permissions for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- Default seed.
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
Hand-add the `role_permissions` types to `database.ts`.

### Resolution — `src/lib/permissions.ts` (pure, tested)
```ts
export type PermMap = Map<UserRole, Set<string>>;

/** Rows → role → granted permission set. */
export function buildPermMap(rows: ReadonlyArray<{ role: UserRole; permission: string }>): PermMap;

/** Whether a role may perform a permission. Admin always can; pending/unknown never. */
export function resolveCan(map: PermMap, role: UserRole | null, perm: string): boolean;
```
`resolveCan`: `role === "admin"` → `true`; `!role` → `false`; else `map.get(role)?.has(perm) ?? false`.

## 5. Hooks

- **`useRolePermissions()`** — reads all `role_permissions` rows → `buildPermMap` → `PermMap`
  (React Query, key `["role_permissions"]`).
- **`usePermissions()`** — combines `useAuth().role` + `useRolePermissions()` → `{ can(perm), isLoading }`.
  `can` uses `resolveCan`. This replaces `isManager` at call sites.
- **`useToggleRolePermission()`** — admin mutation `mutate({ role, permission, granted })`:
  `granted` → insert the pair; else delete it; invalidate `["role_permissions"]`.

## 6. Refactor — replace checks with `can(...)` (UI-enforced)

| Site | Was | Now |
|------|-----|-----|
| `EditEntryModal` unlock button | `isManager` | `can("unlock_entry")` |
| `EditEntryModal` Save / Delete | (lock only) | also gated by `can("edit_entry")` / `can("delete_entry")` |
| `DashboardScreen` Alerts panel | `isManager` | `can("view_alerts")` |
| `SettingsScreen` Access Controls card | `isManager` | `can("change_settings")` |
| `ExportsCard` buttons | (open) | `can("export_data")` |
| `StockScreen` IN / OUT buttons | (open) | `can("stock_in")` / `can("stock_out")` |
| `TransfersScreen` New Transfer | (open) | `can("transfer")` |
| `ItemDetailModal` Move / Out / In / Edit | (open) | `can("transfer")` / `can("stock_out")` / `can("stock_in")` / `can("edit_entry")` |
| `CaptureScreen` | (open) | gated by `can("capture")` (else a "no access" note) |
| `SettingsScreen` Manage users card | `isAdmin` | **unchanged** (hard admin) |

When an action is hidden, the surrounding screen still renders; an empty Stock/Transfers screen
just shows its list without the create button.

## 7. Editor UI (Users screen)

Below the existing user list, an admin-only **"Role permissions"** section: one block per editable
role (**storekeeper**, **manager**), each listing the 10 permissions as labeled checkboxes; toggling
calls `useToggleRolePermission`. **Admin** is shown as a locked **"Full access"** block (no toggles).
`pending` is omitted. Lives in a `RolePermissionsEditor` sub-component to keep `UsersScreen` focused.

## 8. Files

| File | Responsibility |
|------|----------------|
| `src/constants/permissions.ts` | `PermissionKey`, `PERMISSIONS` (key+label), `EDITABLE_ROLES` |
| `src/lib/permissions.ts` (+ test) | `buildPermMap`, `resolveCan` |
| `supabase/migrations/0013_role_permissions.sql` | Table + RLS + seed *(user runs)* |
| `src/types/database.ts` (modify) | `role_permissions` types |
| `src/hooks/useRolePermissions.ts`, `usePermissions.ts`, `useToggleRolePermission.ts` | Read / resolve / toggle |
| `src/screens/Users/RolePermissionsEditor.tsx` | The matrix editor |
| `src/screens/Users/UsersScreen.tsx` (modify) | Mount the editor |
| Refactor (§6): `EditEntryModal`, `DashboardScreen`, `SettingsScreen`, `ExportsCard`, `StockScreen`, `TransfersScreen`, `ItemDetailModal`, `CaptureScreen` | Swap `isManager`/open → `can(...)` |

## 9. Testing

- **`permissions.test.ts`**: `buildPermMap` groups rows by role; `resolveCan` — admin always true,
  pending/null false, granted/ungranted per the map.
- Hooks/refactor/editor: `tsc --noEmit`, `npm run build`, manual (toggle a permission as admin →
  the gated button appears/disappears for that role on reload).

## 10. Out of scope

- Per-user overrides (per-role only).
- DB/RLS enforcement of the workflow permissions (UI-enforced; hard security stays role/RLS-based).
- Making `manage_users` / role changes a toggle (hard admin-only).
- New permissions beyond the catalogue in §3.
