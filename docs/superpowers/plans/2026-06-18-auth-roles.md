# Auth + User-Defined Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Self-signup (defaulting to a new `pending` role behind an approval gate) plus an admin-only Users screen to assign roles, with role changes locked to admins at the DB level.

**Architecture:** A new `pending` enum value; signups land there and are intercepted by a gate screen in `ProtectedRoute`. Admins manage roles via a `/users` screen (direct `profiles.update`, secured by RLS + a guard trigger). Two SQL migrations the owner runs.

**Tech Stack:** React 18 + TS, TanStack Query v5, Zustand, Zod, Supabase JS, Vitest.

Spec: `docs/superpowers/specs/2026-06-18-auth-roles-design.md`.

---

## File structure

| File | Responsibility |
|------|----------------|
| `src/lib/validators/auth.ts` (modify, + test) | `signupSchema` |
| `supabase/migrations/0011_user_role_pending.sql` | Enum value *(user runs)* |
| `supabase/migrations/0012_pending_approval.sql` | Trigger defaults + guard + RLS *(user runs)* |
| `src/types/database.ts` (modify) | Add `"pending"` to `user_role` |
| `src/stores/auth.ts` (modify) | `signUp` |
| `src/screens/Login/SignUpScreen.tsx` | Registration form |
| `src/screens/Login/LoginScreen.tsx` (modify) | "Create account" link |
| `src/screens/Pending/PendingApprovalScreen.tsx` | Gate screen |
| `src/components/ProtectedRoute.tsx` (modify) | Pending gate |
| `src/hooks/useUsers.ts`, `src/hooks/useUpdateUserRole.ts` | Read users / change role |
| `src/screens/Users/UsersScreen.tsx` | Admin user management |
| `src/screens/Settings/SettingsScreen.tsx` (modify) | Admin "Manage users" link |
| `src/App.tsx` (modify) | `/signup`, `/users` routes |

---

## Task 1: `signupSchema` validator

**Files:** Modify `src/lib/validators/auth.ts`, Test `src/lib/validators/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/validators/auth.test.ts
import { describe, it, expect } from "vitest";
import { signupSchema } from "./auth";

const base = { fullName: "Asha", email: "a@b.com", password: "secret1" };

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.parse(base)).toMatchObject({ fullName: "Asha", email: "a@b.com" });
  });
  it("rejects a missing name", () => {
    expect(() => signupSchema.parse({ ...base, fullName: "  " })).toThrow();
  });
  it("rejects a bad email", () => {
    expect(() => signupSchema.parse({ ...base, email: "nope" })).toThrow();
  });
  it("rejects a short password", () => {
    expect(() => signupSchema.parse({ ...base, password: "12345" })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/validators/auth.test.ts`
Expected: FAIL — `signupSchema` is not exported.

- [ ] **Step 3: Add the schema**

Append to `src/lib/validators/auth.ts`:

```typescript
export const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type SignupInput = z.input<typeof signupSchema>;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/validators/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/auth.ts src/lib/validators/auth.test.ts
git commit -m "feat(auth): signupSchema validator"
```

---

## Task 2: migrations + `pending` enum type

**Files:** Create `supabase/migrations/0011_user_role_pending.sql`, `supabase/migrations/0012_pending_approval.sql`, Modify `src/types/database.ts`

- [ ] **Step 1: Create migration 0011 (enum value, on its own)**

```sql
-- supabase/migrations/0011_user_role_pending.sql
-- New self-signups await admin approval in a 'pending' role.
-- (Adding an enum value must be its own migration — Postgres won't let the new
--  value be USED in the same transaction it is added.)
alter type user_role add value if not exists 'pending';
```

- [ ] **Step 2: Create migration 0012 (defaults + guard + RLS)**

```sql
-- supabase/migrations/0012_pending_approval.sql
-- New signups default to 'pending'.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'pending');
  return new;
end $$;

-- Only admins may change a profile's role (closes API self-escalation).
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

-- Pending users can't write stock data, even via the raw API.
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

- [ ] **Step 3: Add `pending` to the generated enum type**

In `src/types/database.ts`, the `user_role` enum appears twice. Replace:

```typescript
      user_role: "storekeeper" | "manager" | "admin"
```

with:

```typescript
      user_role: "storekeeper" | "manager" | "admin" | "pending"
```

and replace:

```typescript
      user_role: ["storekeeper", "manager", "admin"],
```

with:

```typescript
      user_role: ["storekeeper", "manager", "admin", "pending"],
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_user_role_pending.sql supabase/migrations/0012_pending_approval.sql src/types/database.ts
git commit -m "feat(auth): pending role migrations + enum type"
```

- [ ] **Step 6: USER STEP (out-of-band)** — owner runs `npx supabase db push` (applies 0011 then 0012). Code already compiles against the hand-added enum.

---

## Task 3: `signUp` in the auth store

**Files:** Modify `src/stores/auth.ts`

- [ ] **Step 1: Add `signUp` to the interface**

Replace:

```tsx
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
```

with:

```tsx
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
```

- [ ] **Step 2: Implement it**

After the `signIn` implementation (the block ending `if (error) throw error; // onAuthStateChange updates the store },`), add:

```tsx
  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error; // handle_new_user creates a pending profile
  },
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/auth.ts
git commit -m "feat(auth): signUp in the auth store"
```

---

## Task 4: SignUpScreen + Login link + route

**Files:** Create `src/screens/Login/SignUpScreen.tsx`, Modify `src/screens/Login/LoginScreen.tsx`, `src/App.tsx`

- [ ] **Step 1: Create the sign-up screen**

```tsx
// src/screens/Login/SignUpScreen.tsx
import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { signupSchema } from "@/lib/validators/auth";

export function SignUpScreen() {
  const status = useAuthStore((s) => s.status);
  const signUp = useAuthStore((s) => s.signUp);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // If a session is created (email confirmation off), the pending gate takes over.
  if (status === "signed-in") return <Navigate to="/capture" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  const field = "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M Designs</div>
          <h1 className="text-2xl font-bold mt-1">StockHub</h1>
        </div>

        {done ? (
          <div className="bg-white rounded-xl shadow-sm border border-brand-line p-6 text-center">
            <div className="text-2xl mb-2">✅</div>
            <h2 className="font-bold mb-1">Account created</h2>
            <p className="text-sm text-brand-mute">An admin will approve your access. You can sign in once approved.</p>
            <Link to="/login" className="inline-block mt-4 rounded-lg bg-brand-accent-2 text-white font-semibold px-4 py-2 text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-brand-line p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-brand-mute mb-1">Full name</label>
              <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} autoFocus />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-brand-mute mb-1">Email</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-brand-mute mb-1">Password</label>
              <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>

            {error && <p className="text-sm text-brand-bad" role="alert">{error}</p>}

            <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand-accent-2 text-white font-semibold py-2.5 text-sm disabled:opacity-60">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        {!done && (
          <p className="text-xs text-brand-mute text-center mt-4">
            Already have an account? <Link to="/login" className="font-semibold text-brand-accent-2">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the "Create account" link to Login**

In `src/screens/Login/LoginScreen.tsx`, add `Link` to the router import:

```tsx
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
```

Replace:

```tsx
        <p className="text-xs text-brand-mute text-center mt-4">
          Accounts are provisioned by your administrator.
        </p>
```

with:

```tsx
        <p className="text-xs text-brand-mute text-center mt-4">
          New here? <Link to="/signup" className="font-semibold text-brand-accent-2">Create account</Link>
        </p>
```

- [ ] **Step 3: Add the route in `src/App.tsx`**

Add after the `SettingsScreen` / `StockScreen` import group:

```tsx
import { SignUpScreen } from "@/screens/Login/SignUpScreen";
```

Add after the `<Route path="/login" … />` line:

```tsx
            <Route path="/signup" element={<SignUpScreen />} />
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Login/SignUpScreen.tsx src/screens/Login/LoginScreen.tsx src/App.tsx
git commit -m "feat(auth): SignUpScreen + login link + /signup route"
```

---

## Task 5: PendingApprovalScreen + gate

**Files:** Create `src/screens/Pending/PendingApprovalScreen.tsx`, Modify `src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Create the gate screen**

```tsx
// src/screens/Pending/PendingApprovalScreen.tsx
import { useAuth } from "@/hooks/useAuth";

export function PendingApprovalScreen() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6 text-center">
      <div className="text-3xl mb-3">⏳</div>
      <h1 className="text-xl font-bold mb-2">Waiting for approval</h1>
      <p className="text-sm text-brand-mute max-w-xs">
        Your account (<b>{user?.email}</b>) is created but needs an admin to grant access. You'll be able to use StockHub once approved.
      </p>
      <button onClick={() => void signOut()} className="mt-6 rounded-lg border border-brand-line px-4 py-2 text-sm font-semibold">
        Sign out
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Gate pending users in `ProtectedRoute`**

In `src/components/ProtectedRoute.tsx`, add the import:

```tsx
import { PendingApprovalScreen } from "@/screens/Pending/PendingApprovalScreen";
```

Replace:

```tsx
  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles) {
```

with:

```tsx
  if (status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profileLoading) return <Splash message="Loading…" />;
  if (role === "pending") return <PendingApprovalScreen />;

  if (allowedRoles) {
```

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Pending/PendingApprovalScreen.tsx src/components/ProtectedRoute.tsx
git commit -m "feat(auth): pending-approval gate"
```

---

## Task 6: users hooks

**Files:** Create `src/hooks/useUsers.ts`, `src/hooks/useUpdateUserRole.ts`

- [ ] **Step 1: Create `useUsers`**

```tsx
// src/hooks/useUsers.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/types/profile";

export type UserListItem = Pick<ProfileRow, "id" | "email" | "full_name" | "role">;

export const usersKeys = { all: ["users"] as const };

async function fetchUsers(): Promise<UserListItem[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .order("email");
  if (error) throw error;
  return (data ?? []) as UserListItem[];
}

/** All user profiles (readable by any authenticated user per RLS). */
export function useUsers() {
  return useQuery({ queryKey: usersKeys.all, queryFn: fetchUsers });
}
```

- [ ] **Step 2: Create `useUpdateUserRole`**

```tsx
// src/hooks/useUpdateUserRole.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/profile";
import { usersKeys } from "./useUsers";

/** Change a user's role. RLS + the guard_role_change trigger restrict this to admins. */
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; role: UserRole }>({
    mutationFn: async ({ id, role }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useUsers.ts src/hooks/useUpdateUserRole.ts
git commit -m "feat(auth): useUsers + useUpdateUserRole hooks"
```

---

## Task 7: UsersScreen + route + Settings link

**Files:** Create `src/screens/Users/UsersScreen.tsx`, Modify `src/App.tsx`, `src/screens/Settings/SettingsScreen.tsx`

- [ ] **Step 1: Create the Users screen**

```tsx
// src/screens/Users/UsersScreen.tsx
import { useUsers } from "@/hooks/useUsers";
import { useUpdateUserRole } from "@/hooks/useUpdateUserRole";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/stores/toast";
import { errMessage } from "@/lib/errors";
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
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Add the route in `src/App.tsx`**

Add to the imports:

```tsx
import { UsersScreen } from "@/screens/Users/UsersScreen";
```

Add after the `/settings` route line:

```tsx
            <Route path="/users" element={protect(<UsersScreen />)} />
```

- [ ] **Step 3: Add an admin-only "Manage users" link in Settings**

In `src/screens/Settings/SettingsScreen.tsx`, add imports at the top:

```tsx
import { Link } from "react-router-dom";
import { Card } from "./Card";
```

(If `Card` is already imported, don't duplicate it.) Change the auth destructure to include `isAdmin`:

```tsx
  const { isManager, isAdmin } = useAuth();
```

Add this card just before the `<AboutCard />` in the `<main>`:

```tsx
        {isAdmin && (
          <Card title="Team">
            <Link to="/users" className="block w-full rounded-lg border border-brand-line py-2 text-sm font-semibold text-center text-brand-ink">
              Manage users →
            </Link>
          </Card>
        )}
```

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Users/UsersScreen.tsx src/App.tsx src/screens/Settings/SettingsScreen.tsx
git commit -m "feat(auth): admin Users screen + Settings link + route"
```

---

## Task 8: full verification

- [ ] **Step 1: Typecheck, build, and run the whole test suite**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: "built in …", no errors.
Run: `npx vitest run`
Expected: all tests pass (56 existing + 4 new = 60).

---

## Done — manual verification (after the user runs migrations 0011 + 0012)

1. **Login → "Create account"** opens `/signup`; submitting creates the account and shows "an admin will approve your access."
2. Signing in as that new user shows the **Waiting for approval** screen (no tabs); **Sign out** works.
3. As an **admin**, **Settings → Manage users** opens `/users`: the new user appears under **Pending approvals**; approving as Storekeeper grants access (they can now use the app on next load).
4. In **All users**, changing a role updates it; your **own** row's selector is **disabled**.
5. A **non-admin** visiting `/users` sees "Admins only".
6. A **pending** user cannot write data even via the API (insert blocked by RLS) — optional spot-check.
