# Auth + User-Defined Roles — Design Spec

Status: **approved** · Date: 2026-06-18 · Browser-only (no service_role).

---

## 1. Goal

Let staff **self-register** and let admins **manage roles** — without the Supabase dashboard.
New accounts wait in a **pending** state (no access) until an admin assigns a real role from a
dedicated **Users** screen, and role changes are locked to admins at the database level.

## 2. Decisions (locked)

| Decision | Choice |
|----------|--------|
| Signup gate | **Pending approval.** New signups default to a new `pending` role; no app access until approved. |
| Users management | **Dedicated `/users` screen**, admin-only, linked from Settings. |
| Self-role guard | A user **cannot change their own role** (UI disables their own selector) — prevents last-admin lockout. |
| Pending lockout | Pending users blocked from **writing** stock data at the DB level (insert RLS); reads left as-is (no UI access anyway). |
| Role-change security | A **`guard_role_change` trigger** rejects any role change unless the caller is an admin. |
| User creation/deletion | Self-signup only; **deleting** auth users stays in the Supabase dashboard (needs service_role). |

## 3. Roles

Add `pending` to the `user_role` enum → `pending | storekeeper | manager | admin`. New profiles
default to `pending` (via the updated `handle_new_user` trigger).

## 4. Self sign-up

- `src/stores/auth.ts` gains `signUp(email, password, fullName): Promise<void>` →
  `supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })`. The
  existing `handle_new_user` trigger creates the profile (now `pending`, `full_name` from metadata).
- `src/lib/validators/auth.ts` gains `signupSchema` (fullName required; email; password ≥ 6).
- New **`SignUpScreen`** at `/signup`, linked from `LoginScreen` ("Create account"). On success it
  shows: *"Account created — an admin will approve your access."* (Copy works whether or not the
  Supabase project requires email confirmation; if a session is created, the pending gate (§5) catches it.)

## 5. Pending gate

In `src/components/ProtectedRoute.tsx`: once signed-in and the profile has loaded, if
`role === "pending"` render **`PendingApprovalScreen`** (message + Sign out) instead of the app —
no tabs, no screens. While the profile is still loading, show the existing loading state. Non-pending
roles proceed as today.

## 6. Admin Users screen (`/users`)

- **`useUsers()`** — `supabase.from("profiles").select("id,email,full_name,role").order("email")`
  (all authenticated can read profiles per existing RLS).
- **`useUpdateUserRole()`** — `mutate({ id, role })` → `supabase.from("profiles").update({ role }).eq("id", id)`
  (allowed for admins by RLS + the guard trigger), invalidates the users query.
- **`UsersScreen`** (admin-only): a **"Pending approvals"** section (each pending user → assign a role
  to approve) and an **"All users"** list (name · email · role `<select>`). The signed-in admin's own
  row has its selector **disabled** (self-role guard).
- **Route**: `/users` is `protect()`-wrapped; if `!isAdmin`, render a short "Admins only" notice
  (no redirect loop). Reached via an admin-only **"Manage users"** button on `SettingsScreen`.

## 7. Security hardening

The current "Profiles own-update" policy (`id = auth.uid() or current_user_role()='admin'`) lets a
user update their **own** row, including `role` — an escalation hole. Closed by:
- **`guard_role_change` trigger** (BEFORE UPDATE on `profiles`): if `new.role is distinct from old.role`
  and `current_user_role() <> 'admin'`, raise an exception. Admins (incl. the Users screen) pass;
  self-updates of `full_name` still work (role unchanged).
- **Tightened insert RLS** on `entries`, `transfers`, `movements`: add
  `and current_user_role()::text <> 'pending'` to the existing `with check`, so a pending account
  can't write stock data even via the raw API.

## 8. Database — two migrations (user runs)

`alter type ... add value` can't be *used* in the transaction that adds it, so the enum value is its
own migration:

**`0011_user_role_pending.sql`**
```sql
alter type user_role add value if not exists 'pending';
```

**`0012_pending_approval.sql`**
```sql
-- New signups await admin approval.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'pending');
  return new;
end $$;

-- Only admins may change a profile's role.
create or replace function public.guard_role_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and current_user_role() <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end $$;

drop trigger if exists guard_role_change on profiles;
create trigger guard_role_change before update on profiles
  for each row execute function public.guard_role_change();

-- Pending users can't write stock data (even via raw API).
drop policy if exists "Entries insert own" on entries;
create policy "Entries insert own" on entries for insert
  with check (created_by = auth.uid() and current_user_role()::text <> 'pending');

drop policy if exists "Transfers insert" on transfers;
create policy "Transfers insert" on transfers for insert
  with check (created_by = auth.uid() and current_user_role()::text <> 'pending');

drop policy if exists "Movements insert" on movements;
create policy "Movements insert" on movements for insert
  with check (created_by = auth.uid() and current_user_role()::text <> 'pending');
```

Then hand-add `"pending"` to the `user_role` union in `src/types/database.ts` (so the app compiles
before the user regenerates).

## 9. Files

| File | Responsibility |
|------|----------------|
| `supabase/migrations/0011_user_role_pending.sql` | Enum value *(user runs)* |
| `supabase/migrations/0012_pending_approval.sql` | Trigger defaults + guard + RLS *(user runs)* |
| `src/types/database.ts` (modify) | Add `"pending"` to `user_role` |
| `src/types/profile.ts` (modify if needed) | Ensure `UserRole` includes `pending` |
| `src/stores/auth.ts` (modify) | `signUp` |
| `src/lib/validators/auth.ts` (modify, +test) | `signupSchema` |
| `src/screens/Login/SignUpScreen.tsx` | Registration form |
| `src/screens/Login/LoginScreen.tsx` (modify) | "Create account" link |
| `src/screens/Pending/PendingApprovalScreen.tsx` | The gate screen |
| `src/components/ProtectedRoute.tsx` (modify) | Pending gate |
| `src/hooks/useUsers.ts`, `src/hooks/useUpdateUserRole.ts` | Read users / change role |
| `src/screens/Users/UsersScreen.tsx` | Admin user management |
| `src/screens/Settings/SettingsScreen.tsx` (modify) | Admin "Manage users" link |
| `src/App.tsx` (modify) | `/signup`, `/users` routes |

## 10. Testing

- **`auth` validator test**: `signupSchema` accepts a valid signup; rejects missing name, bad email,
  short password.
- Gate, Users screen, RLS: `tsc --noEmit`, `npm run build`, and manual (sign up → pending screen →
  admin approves → access; non-admin can't reach `/users`; a user can't change their own role).

## 11. Out of scope

- Deleting/deactivating auth users (Supabase dashboard; needs service_role).
- Password reset / email-change flows (Supabase hosted UI handles these).
- Blocking pending users from **reads** (writes are the data-integrity risk; reads add churn for little gain).
- Per-role tab visibility beyond what already exists (manager-only Access Controls, etc. unchanged).
