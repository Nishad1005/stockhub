-- Verify the June 2026 master append (master_items_2026-06-23.sql).
-- Run AFTER loading the append. Read-only; safe to run any time.

-- 1) Totals — expect: total = 4877, newly_added = 316, highest_code = ITM-05160
select count(*)                                  as total,
       count(*) filter (where code >= 'ITM-04845') as newly_added,
       max(code)                                 as highest_code
from master_items;

-- 2) Spot-check a few of the new items by their factory Product Code (sku)
select code, name, sku
from master_items
where sku in ('UNMPL/SKU/26-27/87', 'BD1023-08Q', 'MM-00039')
order by code;
