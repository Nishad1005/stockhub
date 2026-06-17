-- Phase 11 — Inventory (Stock IN/OUT + running stock).

-- Live-count: stock is simply the sum of entry quantities (transfers + IN/OUT all mutate entries).
create or replace view running_stock as
  select master_code, shelf_code, sum(coalesce(qty, 0))::numeric as stock
  from entries
  where master_code is not null
  group by master_code, shelf_code;

-- System on-hand at the moment of an OUT (null for IN); discrepancy when qty > available_qty.
alter table movements add column if not exists available_qty numeric;

-- Ref-number generators (sequences grn_seq / mir_seq already exist from migration 0001).
create or replace function next_grn_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('grn_seq');
begin return 'GRN/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

create or replace function next_mir_number() returns text language plpgsql as $$
declare ym text := to_char(now(),'YYYY-MM'); n int := nextval('mir_seq');
begin return 'MIR/' || ym || '/' || lpad(n::text, 4, '0'); end $$;

grant execute on function next_grn_number() to authenticated;
grant execute on function next_mir_number() to authenticated;
