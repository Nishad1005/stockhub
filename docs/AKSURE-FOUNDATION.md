# Aksure Foundation Layer

> The shared base every Aksure module (GRN, Dispatch, Release Request, QC, Cycle Count,
> Returns) builds on. This doc is the source of truth: new modules MUST use these three
> pieces consistently. Foundation added in migration `0015`, applied 2026-06-28.

---

## 1. What this layer is

Migration `0015_aksure_foundation` plus a small helper layer add three reusable building
blocks: **`tenants`** (multi-tenant root), **`attachments`** (polymorphic file store), and
**`activity_log`** (append-only audit trail). Full multi-tenancy is **deferred** — only NEW
Aksure tables carry `tenant_id`. The existing StockHub tables (`entries`, `transfers`,
`movements`, `zones`, `shelves`, `master_items`, `profiles`, `app_settings`,
`role_permissions`) stay single-tenant for now; wiring them to a tenant is a future refactor,
not part of any module sprint.

---

## 2. The `tenants` table

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `default gen_random_uuid()` |
| `name` | text not null | |
| `gst` | text | nullable |
| `address` | text | nullable |
| `status` | text not null | `default 'active'`, `check (status in ('active','suspended'))` |
| `created_at` | timestamptz not null | `default now()` |

- **Seeded with one row** — U&M Designs Pvt Ltd (`status = 'active'`). No other tenants exist.
- **RLS**: read by any authenticated user; write by **admin only**
  (`Tenants readable` for select; `Tenants admin-write` for all).
- The live tenant id is **hard-coded** in `src/constants/tenant.ts`:

```ts
export const CURRENT_TENANT_ID = "e4263864-6333-42e7-b1b1-49dfe1312d11";
```

> **TODO:** `CURRENT_TENANT_ID` becomes session-derived when full multi-tenancy ships.
> Until then, every Aksure insert uses this constant.

---

## 3. The `attachments` table — use this for ALL photos and docs

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `default gen_random_uuid()` |
| `tenant_id` | uuid not null → `tenants(id)` | |
| `entity_type` | text not null | e.g. `'grn'`, `'grn_line'`, `'dispatch'`, `'qc_hold'` |
| `entity_id` | uuid not null | the row in that entity |
| `file_url` | text not null | public URL in Storage |
| `file_type` | text not null | short code: `'photo'` / `'pdf'` / `'doc'` |
| `caption` | text | nullable |
| `created_at` | timestamptz not null | `default now()` |
| `created_by` | uuid not null → `profiles(id)` | |

Index: `attachments_entity_idx (entity_type, entity_id)`.

- **Polymorphic**: `entity_type` + `entity_id` point at any other table's row. One attachments
  table serves every module — no per-module photo tables.
- **RLS**: read by any authenticated; insert by the owner and non-pending
  (`created_by = auth.uid() and current_user_role()::text <> 'pending'`); update/delete by
  manager/admin or the owner (same shape as the `entries` policies).
- **Bucket**: `'aksure-attachments'` in Supabase Storage, **created manually** in the dashboard
  (no migration creates Storage buckets — same owner-provisioned pattern as `entry-photos`,
  per SYSTEM-REFERENCE §12).

The bucket's RLS policies are captured in migration `0018`. On a fresh environment:
(1) create the bucket in Supabase Storage with the name `aksure-attachments` (private,
5 MB limit), (2) apply migrations through `0018` to install the policies.

### How to use it

```ts
function useAttachments(
  entityType: string,
  entityId: string | null,
): {
  attachments: AttachmentRow[];
  isLoading: boolean;
  addAttachment: (file: File) => void;   // compresses images, uploads, inserts the row
  removeAttachment: (id: string) => void; // deletes the row only (not the Storage object)
  isUploading: boolean;
};
```

The query is **skipped while `entityId` is null** (nothing to attach to yet). Concrete example —
a GRN gate entry that needs a vehicle photo and a document photo:

```tsx
const { attachments, addAttachment, removeAttachment, isUploading } =
  useAttachments('grn_gate_entry', grnGateEntryId);

const handleVehiclePhoto = (file: File) => {
  addAttachment(file);
};

// Display existing
attachments.map(a => <img src={a.file_url} key={a.id} />)
```

### What NOT to do

- **Do NOT** add `*_photo_url` or `*_document_url` columns to module tables. Use `attachments`
  with the right `entity_type`.
- **Do NOT** upload directly to Supabase Storage from module code. Use `useAttachments` — it
  handles image compression (via `lib/photo.ts`), the right bucket, and the `attachments` row
  insert together.

---

## 4. The `activity_log` table — append-only audit trail

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `default gen_random_uuid()` |
| `tenant_id` | uuid not null → `tenants(id)` | |
| `actor_id` | uuid → `profiles(id)` | nullable (system actions) |
| `actor_role` | user_role | nullable |
| `action` | text not null | `<module>.<entity>.<verb>` (see convention below) |
| `entity_type` | text not null | |
| `entity_id` | uuid | nullable |
| `before` | jsonb | nullable — state before the change |
| `after` | jsonb | nullable — state after the change |
| `ip_address` | text | nullable (always null today — see §7) |
| `user_agent` | text | nullable |
| `notes` | text | nullable |
| `created_at` | timestamptz not null | `default now()` |

Indexes: `(entity_type, entity_id, created_at desc)` and `(actor_id, created_at desc)`.

- **Append-only**, enforced by trigger `prevent_activity_log_mutation()`: any `UPDATE` or
  `DELETE` raises `P0001` (`raise exception`). Rows are permanent.
- **RLS**: managers/admins can read; any authenticated, non-pending user can insert. There are
  no update/delete policies.
- The trigger fires **`BEFORE UPDATE OR DELETE FOR EACH ROW`**, so it catches `service_role` and
  `security definer` paths too — RLS alone would not. **The append-only guarantee is
  unconditional**, regardless of role.

### How to use it

```ts
function logActivity(input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Json | null;
  after?: Json | null;
  notes?: string | null;
}): void;
```

Concrete example — a GRN being rejected:

```ts
logActivity({
  action: 'grn.shipment.rejected',
  entityType: 'grn',
  entityId: grnId,
  before: { status: 'DRAFT' },
  after: { status: 'REJECTED' },
  notes: rejectionReason,
});
```

`tenant_id` (from `CURRENT_TENANT_ID`), `actor_id`/`actor_role` (from the auth store), and
`user_agent` are filled in for you.

### Action naming convention

Format: `<module>.<entity>.<verb>` — lowercase, dot-separated. Examples:

- `grn.gate_entry.created`
- `grn.line.qc_status_changed`
- `grn.shipment.verified`
- `grn.shipment.rejected`
- `grn.putaway.completed`
- `dispatch.carton.picked` (future)
- `qc.hold.released` (future)

### When to log

- Every **state transition** on a workflow record (GRN status changes, dispatch status changes,
  QC decisions, adjustments).
- Every **manager override**.
- Every **rejection or hold** action.
- Every **approval**.

### When NOT to log

- Routine reads.
- Capture events (already recorded in the `entries` / `transfers` tables).
- Failed UI validation (no DB change).

### Fire-and-forget contract

`logActivity` returns `void`, **not a promise**. It catches all errors internally and
`console.error`s them, so a logging failure can never break the user action that triggered it.
**Do not `await` it. Do not read its return value.**

---

## 5. The `tenant_id` pattern for new tables

Every NEW table created from Sprint 1 onward includes:

```sql
tenant_id uuid not null references tenants(id)
```

In RLS policies, gate by `tenant_id` **when multi-tenancy ships**. For now, every insert
hard-codes `CURRENT_TENANT_ID` from `src/constants/tenant.ts`.

Existing tables (`zones`, `shelves`, `master_items`, `profiles`, `entries`, `transfers`,
`movements`, `app_settings`, `role_permissions`) do **NOT** get `tenant_id` yet — that's the
future multi-tenancy refactor, not part of any Aksure module sprint.

---

## 6. Quick checklist for every new Aksure module

When building a new module (GRN Stage 2, Dispatch, QC, etc.), confirm:

- [ ] All new tables have `tenant_id NOT NULL references tenants(id)`
- [ ] Photos and documents go through `useAttachments`, not raw columns
- [ ] Every state transition calls `logActivity` with the right action name
- [ ] Manager overrides and rejections are logged with a reason in `notes`
- [ ] The `aksure-attachments` bucket exists in the target environment (dev / staging / prod)

---

## 7. Open items

- **Tenant resolution from session** (not a hard-coded constant) — deferred to the
  multi-tenancy sprint.
- **`actor_role` in `activity_log` is best-effort** right now (read from session
  `user_metadata` if present, else null) — see the TODO in `src/lib/activity.ts`.
- **`ip_address` in `activity_log` is always null** — server-side capture deferred.
- **Storage bucket provisioning is manual** — no migration creates buckets.
