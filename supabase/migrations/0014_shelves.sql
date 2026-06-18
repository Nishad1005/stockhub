-- Authoritative registry of physical shelves (612), from the zone label PDFs.
create table shelves (
  code         text primary key check (code ~ '^Z[0-9]+-[SGPR][0-9]+$'),
  zone_code    text not null references zones(code),
  fixture_type fixture_type not null,
  seq          int  not null,
  unique (zone_code, fixture_type, seq)
);

insert into shelves (code, zone_code, fixture_type, seq)
  select 'Z1-S'||lpad(g::text,3,'0'), 'Z01', 'S'::fixture_type, g from generate_series(1,116) g
  union all select 'Z2-S'||lpad(g::text,3,'0'), 'Z02', 'S'::fixture_type, g from generate_series(1,37) g
  union all select 'Z2-G'||lpad(g::text,3,'0'), 'Z02', 'G'::fixture_type, g from generate_series(1,11) g
  union all select 'Z3-S'||lpad(g::text,3,'0'), 'Z03', 'S'::fixture_type, g from generate_series(1,96) g
  union all select 'Z3-P'||lpad(g::text,3,'0'), 'Z03', 'P'::fixture_type, g from generate_series(1,22) g
  union all select 'Z4-P'||lpad(g::text,3,'0'), 'Z04', 'P'::fixture_type, g from generate_series(1,62) g
  union all select 'Z5-R'||lpad(g::text,3,'0'), 'Z05', 'R'::fixture_type, g from generate_series(1,136) g
  union all select 'Z6-S'||lpad(g::text,3,'0'), 'Z06', 'S'::fixture_type, g from generate_series(1,132) g
on conflict do nothing;

alter table shelves enable row level security;
create policy "Shelves readable" on shelves for select using (auth.role() = 'authenticated');
create policy "Shelves admin-write" on shelves for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');
