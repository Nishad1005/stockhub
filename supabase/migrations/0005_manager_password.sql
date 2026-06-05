-- Manager-action password (separate from the login password).
-- v0.1 gated manager actions (unlock entry, manual-entry mode) behind a single
-- password. v0.2 stores a per-user bcrypt hash in profiles.manager_password_hash
-- and exposes two SECURITY DEFINER RPCs scoped to the current user.
--
-- Model: a manager action requires the signed-in user's OWN manager password.
-- Storekeepers have no manager password set, so verify always returns false for
-- them — they can never pass a manager gate (matches Phase 2 acceptance).
create extension if not exists pgcrypto;

-- Set the current user's manager password (bcrypt). Wired to Settings in Phase 8.
create or replace function set_manager_password(pw text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  update profiles
     set manager_password_hash = crypt(pw, gen_salt('bf')),
         updated_at = now()
   where id = auth.uid();
end $$;

-- Verify a manager password against the current user's stored hash.
-- Returns false when no hash is set (e.g. storekeepers).
create or replace function verify_manager_password(pw text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  h text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select manager_password_hash into h from profiles where id = auth.uid();
  if h is null then
    return false;
  end if;
  return h = crypt(pw, h);
end $$;

grant execute on function set_manager_password(text) to authenticated;
grant execute on function verify_manager_password(text) to authenticated;
