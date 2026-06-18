-- Per-role workflow permissions (UI-enforced). A row = that role is granted that permission.
create table role_permissions (
  role       user_role not null,
  permission text not null,
  primary key (role, permission)
);
alter table role_permissions enable row level security;
create policy "Role perms readable" on role_permissions for select using (auth.role() = 'authenticated');
create policy "Role perms admin-write" on role_permissions for all
  using (current_user_role() = 'admin') with check (current_user_role() = 'admin');

insert into role_permissions (role, permission) values
  ('storekeeper','capture'), ('storekeeper','transfer'), ('storekeeper','stock_in'),
  ('storekeeper','stock_out'), ('storekeeper','edit_entry'), ('storekeeper','export_data'),
  ('manager','capture'), ('manager','transfer'), ('manager','stock_in'), ('manager','stock_out'),
  ('manager','edit_entry'), ('manager','delete_entry'), ('manager','export_data'),
  ('manager','unlock_entry'), ('manager','change_settings'), ('manager','view_alerts'),
  ('admin','capture'), ('admin','transfer'), ('admin','stock_in'), ('admin','stock_out'),
  ('admin','edit_entry'), ('admin','delete_entry'), ('admin','export_data'),
  ('admin','unlock_entry'), ('admin','change_settings'), ('admin','view_alerts')
on conflict do nothing;
