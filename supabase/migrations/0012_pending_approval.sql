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
