-- StockHub v0.2 — initial schema
-- Migration 0001: zones, master_items, entries, transfers, profiles, sequences

-- ═══════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════
create type fixture_type as enum ('S', 'G', 'P', 'R');
create type user_role as enum ('storekeeper', 'manager', 'admin');
create type movement_type as enum ('IN', 'OUT');

-- ═══════════════════════════════════════════════════════════════════
-- 2. REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════
create table zones (
  code        text primary key check (code ~ '^Z[0-9]{2}$'),
  name        text not null,
  default_category text,
  display_order int not null default 0
);

create table master_items (
  code        text primary key check (code ~ '^ITM-[0-9]{5}$'),
  name        text not null,
  definition  text,
  category    text,
  unit        text,
  created_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 3. USERS / PROFILES
-- ═══════════════════════════════════════════════════════════════════
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text not null unique,
  full_name   text,
  role        user_role not null default 'storekeeper',
  -- manager-action password (separate from auth login). Hashed.
  manager_password_hash text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. ENTRIES — captured stock
-- ═══════════════════════════════════════════════════════════════════
create table entries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid not null references profiles(id),

  zone_code       text not null references zones(code),
  shelf_code      text not null check (shelf_code ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  fixture_type    fixture_type not null,

  name            text not null,
  master_code     text references master_items(code),
  assigned_code   text,           -- when an item without master gets a new code
  defn            text,
  category        text,
  qty             numeric,
  notes           text,
  photo_url       text,
  scanned_barcode text
);

create index entries_zone_idx on entries(zone_code);
create index entries_shelf_idx on entries(shelf_code);
create index entries_master_idx on entries(master_code);
create index entries_created_at_idx on entries(created_at desc);

-- Auto-update updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger entries_set_updated_at before update on entries
  for each row execute function set_updated_at();

-- ═══════════════════════════════════════════════════════════════════
-- 5. TRANSFERS — STN-tracked movements between locations
-- ═══════════════════════════════════════════════════════════════════
create sequence stn_seq;

create table transfers (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid not null references profiles(id),
  stn_number      text not null unique,

  item_code       text references master_items(code),
  item_name       text not null,
  item_defn       text,
  item_category   text,

  source_zone     text not null references zones(code),
  source_shelf    text not null check (source_shelf ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  dest_zone       text not null references zones(code),
  dest_shelf      text not null check (dest_shelf ~ '^Z[0-9]+-[SGPR][0-9]+$'),

  qty             numeric not null check (qty > 0),
  reason          text,
  storekeeper     text,
  helper          text,
  source_deducted boolean not null default false,
  notes           text
);

create index transfers_stn_idx on transfers(stn_number);
create index transfers_created_at_idx on transfers(created_at desc);

-- Generate next STN number: STN/YYYY-MM/NNNN
create or replace function next_stn_number() returns text language plpgsql as $$
declare
  ym text := to_char(now(), 'YYYY-MM');
  n  int := nextval('stn_seq');
begin
  return 'STN/' || ym || '/' || lpad(n::text, 4, '0');
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- 6. MOVEMENTS (Ship 2 / Phase 11) — Credit/Debit ledger
-- ═══════════════════════════════════════════════════════════════════
create sequence grn_seq;
create sequence mir_seq;

create table movements (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid not null references profiles(id),

  type            movement_type not null,
  ref_number      text not null unique, -- GRN/.../NNNN  or  MIR/.../NNNN  etc.

  item_code       text references master_items(code),
  item_name       text not null,
  shelf_code      text not null check (shelf_code ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  zone_code       text not null references zones(code),
  fixture_type    fixture_type not null,

  qty             numeric not null check (qty > 0),

  -- For IN: supplier / source store / "Production"
  -- For OUT: department / "Dispatch" / "Scrap" / "Loss"
  source_or_dest  text not null,
  reason          text,
  authorized_by   text,
  notes           text
);

create index movements_type_idx on movements(type);
create index movements_shelf_idx on movements(shelf_code);
create index movements_item_idx on movements(item_code);
create index movements_created_at_idx on movements(created_at desc);

-- ═══════════════════════════════════════════════════════════════════
-- 7. ITEM CODE SEQUENCE (for NEW items needing assignment)
-- ═══════════════════════════════════════════════════════════════════
-- Starts at 2028 to continue your existing 2,027-item master.
create sequence item_code_seq start with 2028;

create or replace function next_item_code() returns text language plpgsql as $$
begin
  return 'ITM-' || lpad(nextval('item_code_seq')::text, 5, '0');
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- 8. RUNNING STOCK VIEW (Approach A: capture = opening balance)
-- ═══════════════════════════════════════════════════════════════════
-- For each (master_code, shelf_code) pair:
--   stock = sum(entries.qty) + sum(IN movements.qty) - sum(OUT movements.qty)
--         + sum(inbound transfers) - sum(outbound transfers)
create or replace view running_stock as
  with base as (
    select master_code, shelf_code, sum(coalesce(qty, 0))::numeric as opening
    from entries
    where master_code is not null
    group by master_code, shelf_code
  ),
  mv as (
    select item_code as master_code, shelf_code,
           sum(case when type = 'IN'  then qty else 0 end)::numeric as in_qty,
           sum(case when type = 'OUT' then qty else 0 end)::numeric as out_qty
    from movements
    where item_code is not null
    group by item_code, shelf_code
  ),
  tr_in as (
    select item_code as master_code, dest_shelf as shelf_code,
           sum(qty)::numeric as transferred_in
    from transfers
    where item_code is not null
    group by item_code, dest_shelf
  ),
  tr_out as (
    select item_code as master_code, source_shelf as shelf_code,
           sum(qty)::numeric as transferred_out
    from transfers
    where item_code is not null and source_deducted = true
    group by item_code, source_shelf
  )
  select
    coalesce(base.master_code, mv.master_code, tr_in.master_code, tr_out.master_code) as master_code,
    coalesce(base.shelf_code,  mv.shelf_code,  tr_in.shelf_code,  tr_out.shelf_code)  as shelf_code,
    coalesce(base.opening, 0) + coalesce(mv.in_qty, 0) - coalesce(mv.out_qty, 0)
      + coalesce(tr_in.transferred_in, 0) - coalesce(tr_out.transferred_out, 0) as stock
  from base
  full outer join mv     using (master_code, shelf_code)
  full outer join tr_in  using (master_code, shelf_code)
  full outer join tr_out using (master_code, shelf_code);

-- ═══════════════════════════════════════════════════════════════════
-- 9. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
alter table profiles    enable row level security;
alter table entries     enable row level security;
alter table transfers   enable row level security;
alter table movements   enable row level security;
alter table zones       enable row level security;
alter table master_items enable row level security;

-- Helper: get current user role
create or replace function current_user_role() returns user_role language sql stable as $$
  select role from profiles where id = auth.uid();
$$;

-- Profiles: users can read all, but only update their own (except admins)
create policy "Profiles readable by authenticated" on profiles
  for select using (auth.role() = 'authenticated');
create policy "Profiles own-update" on profiles
  for update using (id = auth.uid() or current_user_role() = 'admin');

-- Reference tables: read for all authenticated, write for admins
create policy "Zones readable" on zones for select using (auth.role() = 'authenticated');
create policy "Zones admin-write" on zones for all using (current_user_role() = 'admin');

create policy "Master readable" on master_items for select using (auth.role() = 'authenticated');
create policy "Master admin-write" on master_items for all using (current_user_role() in ('admin','manager'));

-- Entries: storekeeper sees own + manager sees all
create policy "Entries readable by all auth" on entries for select using (auth.role() = 'authenticated');
create policy "Entries insert own" on entries for insert with check (created_by = auth.uid());
create policy "Entries update by manager or owner-within-lock" on entries for update
  using (
    current_user_role() in ('manager','admin')
    or created_by = auth.uid()
  );

-- Transfers and movements: similar pattern
create policy "Transfers readable" on transfers for select using (auth.role() = 'authenticated');
create policy "Transfers insert" on transfers for insert with check (created_by = auth.uid());

create policy "Movements readable" on movements for select using (auth.role() = 'authenticated');
create policy "Movements insert" on movements for insert with check (created_by = auth.uid());

-- ═══════════════════════════════════════════════════════════════════
-- 10. PROFILE AUTO-CREATION ON SIGNUP
-- ═══════════════════════════════════════════════════════════════════
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), 'storekeeper');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
