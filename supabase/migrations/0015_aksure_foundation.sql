-- StockHub v0.2 — Aksure foundation layer
-- Migration 0015: tenants, attachments (polymorphic), activity_log (append-only).
-- Additive only — no existing table, function, view, or RLS policy is modified.

-- ═══════════════════════════════════════════════════════════════════
-- 1. TENANTS — multi-tenant root (one live tenant today: U&M Designs)
-- ═══════════════════════════════════════════════════════════════════
create table tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gst         text,
  address     text,
  status      text not null default 'active' check (status in ('active','suspended')),
  created_at  timestamptz not null default now()
);

-- Seed the single live tenant. Its generated id is needed for later backfills
-- (entries/transfers/movements → tenant_id) — those run in a future migration,
-- NOT here. This migration adds no backfill.
insert into tenants (name, status) values ('U&M Designs Pvt Ltd', 'active');

alter table tenants enable row level security;
create policy "Tenants readable" on tenants for select using (auth.role() = 'authenticated');
create policy "Tenants admin-write" on tenants for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

-- ═══════════════════════════════════════════════════════════════════
-- 2. ATTACHMENTS — polymorphic files attached to any entity
-- ═══════════════════════════════════════════════════════════════════
create table attachments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  entity_type  text not null,                 -- e.g. 'grn', 'grn_line', 'dispatch', 'qc_hold'
  entity_id    uuid not null,
  file_url     text not null,
  file_type    text not null,                 -- mime type or short code: 'photo', 'pdf', 'doc'
  caption      text,
  created_at   timestamptz not null default now(),
  created_by   uuid not null references profiles(id)
);

create index attachments_entity_idx on attachments(entity_type, entity_id);

alter table attachments enable row level security;
-- Read: any authenticated. Insert: own + not pending (mirrors the entries insert policy).
create policy "Attachments readable" on attachments for select using (auth.role() = 'authenticated');
create policy "Attachments insert own" on attachments for insert
  with check (created_by = auth.uid() and current_user_role()::text <> 'pending');
-- Update/delete: manager/admin or the row owner (same shape as the entries policies).
create policy "Attachments update by manager or owner" on attachments for update
  using (current_user_role() in ('manager','admin') or created_by = auth.uid());
create policy "Attachments delete by manager or owner" on attachments for delete
  using (current_user_role() in ('manager','admin') or created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- 3. ACTIVITY_LOG — append-only audit trail
-- ═══════════════════════════════════════════════════════════════════
create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id),
  actor_id     uuid references profiles(id),  -- nullable for system actions
  actor_role   user_role,
  action       text not null,                 -- e.g. 'grn.gate_entry.created'
  entity_type  text not null,
  entity_id    uuid,
  before       jsonb,
  after        jsonb,
  ip_address   text,
  user_agent   text,
  notes        text,
  created_at   timestamptz not null default now()
);

create index activity_log_entity_idx on activity_log(entity_type, entity_id, created_at desc);
create index activity_log_actor_idx  on activity_log(actor_id, created_at desc);

alter table activity_log enable row level security;
-- Read: manager/admin only. Insert: any authenticated, non-pending.
create policy "Activity log readable by manager/admin" on activity_log for select
  using (current_user_role() in ('manager','admin'));
create policy "Activity log insert" on activity_log for insert
  with check (auth.role() = 'authenticated' and current_user_role()::text <> 'pending');

-- Append-only: reject every UPDATE/DELETE regardless of role. This is enforced in a
-- trigger (not just RLS) so it holds even for code paths that bypass RLS.
create or replace function prevent_activity_log_mutation() returns trigger
  language plpgsql as $$
begin
  raise exception 'activity_log is append-only; % is not permitted', tg_op;
end $$;

create trigger activity_log_no_mutation
  before update or delete on activity_log
  for each row execute function prevent_activity_log_mutation();
