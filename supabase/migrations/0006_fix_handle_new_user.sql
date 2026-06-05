-- Fix: "Database error saving new user" when creating an account.
--
-- The 0001 handle_new_user() trigger is SECURITY DEFINER but did not pin a
-- search_path or schema-qualify its target. When fired by Supabase's auth admin
-- (which runs with a restricted search_path), the unqualified `profiles` insert
-- can fail to resolve, and any error in the trigger rolls back the whole
-- auth.users insert — surfacing as a generic "Database error saving new user".
--
-- Recreate it hardened: explicit search_path, schema-qualified, and idempotent
-- so a retry (or a pre-existing profile row) can't break signup. The existing
-- on_auth_user_created trigger already points at this function by name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'storekeeper'
  )
  on conflict (id) do nothing;
  return new;
end $$;
