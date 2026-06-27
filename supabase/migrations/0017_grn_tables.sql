-- GRN Stage 1 (Security gate entry) — tables, RLS, permissions.
-- Depends on: 0015 (tenants), 0016 ('security' role value committed in a prior txn).
-- Additive only — no existing table, function, view, or policy is modified.

-- ═══════════════════════════════════════════════════════════════════
-- 1. GRNS — workflow header (DRAFT → VERIFIED → COMPLETED, or REJECTED)
-- ═══════════════════════════════════════════════════════════════════
create table grns (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id),
  grn_number       text not null unique,        -- GRN/YYYY-MM/NNNN from next_grn_number()
  status           text not null check (status in ('DRAFT','VERIFIED','COMPLETED','REJECTED')),
                                                 -- DRAFT after Security; VERIFIED after Storekeeper;
                                                 -- COMPLETED after putaway; REJECTED if shipment rejected
  supplier_name    text not null,               -- free text for now; suppliers master is later
  po_ref           text,
  invoice_ref      text,
  invoice_date     date,
  rejection_reason text,                         -- set when status -> REJECTED
  created_at       timestamptz not null default now(),
  created_by       uuid not null references profiles(id),
  security_at      timestamptz,                  -- Stage 1 completed (= created_at for now)
  storekeeper_at   timestamptz,                  -- Stage 2 completed (Sprint 2)
  completed_at     timestamptz                   -- Stage 3 completed (Sprint 3)
);

create index grns_status_idx on grns(status, created_at desc);
create index grns_tenant_status_idx on grns(tenant_id, status);

alter table grns enable row level security;
-- Read: any authenticated, non-pending.
create policy "GRNs readable" on grns for select
  using (auth.role() = 'authenticated' and current_user_role()::text <> 'pending');
-- Insert: security/manager/admin, own rows only.
create policy "GRNs insert" on grns for insert
  with check (current_user_role() in ('security','manager','admin') and created_by = auth.uid());
-- Update: storekeeper/manager/admin anytime (Stage 2/3); security only on their OWN rows.
-- The edit-lock WINDOW is a client-side UX gate, NOT enforced in RLS — same as `entries`
-- (docs/SYSTEM-REFERENCE.md §10). The UI compares app_settings.edit_lock_hours against
-- created_at before letting a security user edit; RLS only scopes WHO may update.
create policy "GRNs update" on grns for update
  using (
    current_user_role() in ('storekeeper','manager','admin')
    or (current_user_role() = 'security' and created_by = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════
-- 2. GRN_GATE_ENTRIES — Stage 1 gate data (1:1 with grns)
-- ═══════════════════════════════════════════════════════════════════
create table grn_gate_entries (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id),
  grn_id         uuid not null unique references grns(id) on delete cascade,
  vehicle_number text not null,
  driver_name    text not null,
  driver_license text,                          -- nullable; some drivers don't show ID
  driver_phone   text,
  gate_in_at     timestamptz not null default now(),
  gate_out_at    timestamptz,                   -- nullable; set when the vehicle leaves (future)
  notes          text,
  created_at     timestamptz not null default now(),
  created_by     uuid not null references profiles(id)
);

create index grn_gate_entries_grn_idx on grn_gate_entries(grn_id);
create index grn_gate_entries_vehicle_idx on grn_gate_entries(vehicle_number);

alter table grn_gate_entries enable row level security;
-- Read: any authenticated, non-pending.
create policy "GRN gate entries readable" on grn_gate_entries for select
  using (auth.role() = 'authenticated' and current_user_role()::text <> 'pending');
-- Insert: security/manager/admin, own rows only.
create policy "GRN gate entries insert" on grn_gate_entries for insert
  with check (current_user_role() in ('security','manager','admin') and created_by = auth.uid());
-- Update: the creator (within the client-side edit-lock window) or manager/admin anytime.
-- Same edit-lock note as grns: the window is enforced in the UI, not RLS (SYSTEM-REFERENCE §10).
create policy "GRN gate entries update" on grn_gate_entries for update
  using (current_user_role() in ('manager','admin') or created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- 3. PERMISSIONS — new GRN workflow keys (UI-enforced; admin is always-true)
-- ═══════════════════════════════════════════════════════════════════
insert into role_permissions (role, permission) values
  ('security','grn_gate_entry'), ('security','grn_view_own_gate_entries'),
  ('storekeeper','grn_view_own_gate_entries'), ('storekeeper','grn_verify'), ('storekeeper','grn_putaway'),
  ('manager','grn_gate_entry'), ('manager','grn_view_own_gate_entries'), ('manager','grn_verify'),
  ('manager','grn_putaway'), ('manager','grn_reject'),
  ('admin','grn_gate_entry'), ('admin','grn_view_own_gate_entries'), ('admin','grn_verify'),
  ('admin','grn_putaway'), ('admin','grn_reject')
on conflict do nothing;
