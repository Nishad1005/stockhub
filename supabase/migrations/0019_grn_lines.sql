-- GRN Stage 2 (Storekeeper verification) — grn_lines table, RLS, permission.
-- Depends on: 0015 (tenants), 0017 (grns). Additive only — no existing table,
-- function, view, or policy is modified. No new columns on grns (the existing
-- status check + storekeeper_at already carry the DRAFT→VERIFIED/REJECTED state).

-- ═══════════════════════════════════════════════════════════════════
-- 1. GRN_LINES — per-GRN received lines (Stage 2 verification data)
-- ═══════════════════════════════════════════════════════════════════
create table grn_lines (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id),
  grn_id        uuid not null references grns(id) on delete cascade,
  line_number   int not null,                  -- 1-based, per-GRN (COALESCE(max)+1 in app code)
  item_code     text,                          -- nullable when NEW; bare text ref to master_items (no FK, like entries.master_code)
  item_name     text not null,                 -- always set (master item or manual NEW entry)
  po_qty        numeric,                        -- nullable (unexpected items have no PO qty)
  invoice_qty   numeric,                        -- nullable (unexpected items have no invoice qty)
  received_qty  numeric,                        -- nullable until Storekeeper enters it; required on final submit (app-enforced)
  variance_flag boolean not null default false, -- true if received_qty != invoice_qty
  is_unexpected boolean not null default false, -- true if added post-Stage 1 (not on invoice)
  qc_status     text not null default 'PENDING' check (qc_status in ('PENDING','OK','HOLD','REJECT')),
                                                -- PENDING = not yet decided; OK/HOLD/REJECT set by Storekeeper
  qc_notes      text,                           -- free text; required if HOLD or REJECT (app-enforced)
  created_at    timestamptz not null default now(),
  created_by    uuid not null references profiles(id),
  updated_at    timestamptz not null default now(),
  updated_by    uuid references profiles(id),
  unique (grn_id, line_number)
);

create index grn_lines_grn_idx on grn_lines(grn_id, line_number);
create index grn_lines_item_idx on grn_lines(item_code) where item_code is not null;
-- Partial index for the "needs attention" query (anything not cleanly OK).
create index grn_lines_qc_status_idx on grn_lines(qc_status) where qc_status <> 'OK';

-- Reuse the shared set_updated_at() from 0001 (do NOT redefine it).
create trigger grn_lines_set_updated_at before update on grn_lines
  for each row execute function set_updated_at();

alter table grn_lines enable row level security;
-- Read: any authenticated, non-pending.
create policy "GRN lines readable" on grn_lines for select
  using (auth.role() = 'authenticated' and current_user_role()::text <> 'pending');
-- Insert: storekeeper/manager/admin, own rows only. Stage 2 belongs to the Storekeeper —
-- security cannot add lines.
create policy "GRN lines insert" on grn_lines for insert
  with check (current_user_role() in ('storekeeper','manager','admin') and created_by = auth.uid());
-- Update: storekeeper/manager/admin. The edit-lock WINDOW is a client-side UX gate, NOT
-- enforced in RLS — same as `entries`/`grns` (docs/SYSTEM-REFERENCE.md §10). RLS only scopes WHO.
create policy "GRN lines update" on grn_lines for update
  using (current_user_role() in ('storekeeper','manager','admin'));
-- Delete: manager/admin only. Storekeepers change qc_status but can't delete a line —
-- deletion is a manager escalation.
create policy "GRN lines delete" on grn_lines for delete
  using (current_user_role() in ('manager','admin'));

-- ═══════════════════════════════════════════════════════════════════
-- 2. PERMISSIONS — Stage 2 key (UI-enforced; admin is always-true)
-- ═══════════════════════════════════════════════════════════════════
insert into role_permissions (role, permission) values
  ('storekeeper','grn_add_unexpected_line'),
  ('manager','grn_add_unexpected_line'),
  ('admin','grn_add_unexpected_line')
on conflict do nothing;
