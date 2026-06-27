-- GRN Stage 1 (Security gate entry) — role addition.
-- Adding an enum value must be its OWN migration: Postgres won't let the new value
-- be USED in the same transaction it is added. The tables and the role_permissions
-- seed that reference 'security' therefore live in 0016b_grn_tables.sql.
-- Matches the 0011 'pending' pattern.
alter type user_role add value if not exists 'security';
