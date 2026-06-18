-- New self-signups await admin approval in a 'pending' role.
-- (Adding an enum value must be its own migration — Postgres won't let the new
--  value be USED in the same transaction it is added.)
alter type user_role add value if not exists 'pending';
