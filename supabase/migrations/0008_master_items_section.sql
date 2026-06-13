-- Add a "section" (home-area) classification to the master, from the
-- zone-classified master (UM_Item_Master_Zone_Classified). Each item gets one
-- of 13 logical sections (e.g. "Foam & Cushioning"); category is also cleaned
-- up to the 6-value taxonomy. Populated by supabase/seed/master_enrichment.sql,
-- matched on sku (the factory ERP code). Does NOT touch zones or shelf codes.
alter table master_items add column if not exists section text;

create index if not exists master_items_section_idx on master_items(section);
