-- Migration 0020: realign item_code_seq above the highest existing ITM code.
--
-- Collision background:
--   * 0007 restarted item_code_seq at 4845 (the master then ended at ITM-04844).
--   * The June 2026 master append pushed master ITM codes up to ITM-05160, but the
--     sequence was NEVER bumped — last_value is still 4845, so the next
--     next_item_code() would mint ITM-04846.. and COLLIDE with existing master rows
--     (master_items.code is TEXT 'ITM-#####' and the primary key → the insert fails).
--
-- The `code` column is zero-padded text ('ITM-05160'), while item_code_seq is an
-- integer sequence, so we extract the NUMERIC part (substring from char 5, after the
-- 'ITM-' prefix) and setval from that number. No string comparison, no hardcoded value.
--
-- setval(..., max, true): is_called = true means the NEXT nextval() returns max + 1,
-- so the first newly minted code is ITM-05161 — strictly greater than every existing
-- ITM code. The floor is computed from live data AT APPLY TIME.
--
-- Data fix only: next_item_code(), master_items, entries, and all label/barcode code
-- are untouched. Idempotent — re-running just re-sets the same floor (a no-op unless a
-- higher ITM code has since been added).

select setval(
  'item_code_seq',
  (select max(substring(code from 5)::int)
     from master_items
    where code ~ '^ITM-[0-9]+$'),
  true
);
