-- Shared application settings (single row). Phase 8.
create table app_settings (
  id              smallint primary key default 1 check (id = 1),
  edit_lock_hours int not null default 24 check (edit_lock_hours in (1,6,12,24,48,168)),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references profiles(id)
);
insert into app_settings (id, edit_lock_hours) values (1, 24) on conflict do nothing;

alter table app_settings enable row level security;
create policy "App settings readable" on app_settings
  for select using (auth.role() = 'authenticated');
create policy "App settings manager-write" on app_settings
  for update using (current_user_role() in ('manager','admin'))
  with check (current_user_role() in ('manager','admin'));
