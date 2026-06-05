-- Add master_items.sku — the factory ERP "Product Code" (e.g. UM-000106,
-- UNM/SKU/24-25/1517, MM-01657). The StockHub catalog code stays ITM-NNNNN
-- (primary key); sku preserves the original ERP identity for barcode/ERP
-- lookups. Nullable: some master rows have no ERP code.
alter table master_items add column if not exists sku text;

-- Not unique: the same ERP code can legitimately recur, and many rows are null.
create index if not exists master_items_sku_idx on master_items (sku);
