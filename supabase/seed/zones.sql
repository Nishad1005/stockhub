-- Zone seed data — mirrors src/constants/zones.ts (1:1 with v0.1 HTML ZONES).
-- default_category and purpose drive Capture behavior — keep in sync with v0.1.
-- Requires migration 0002_zones_add_purpose.sql (purpose column).

insert into zones (code, name, default_category, purpose, display_order) values
  ('Z01', 'RAW-MATERIALS',   'Raw Material',   'Fast/medium moving raw material',      1),
  ('Z02', 'RAW-BULK/SLOW',   'Raw Material',   'Slow/bulk raw material',               2),
  ('Z03', 'HARDWARE-SPARES', 'Hardware',       'Small parts and spares',               3),
  ('Z04', 'PACKAGING',       'Packaging',      'Packing material',                     4),
  ('Z05', 'CONSUMABLES',     'Consumable',     'Daily factory consumables',            5),
  ('Z06', 'TOOLS-ASSETS',    'Asset',          'Tools and assets',                     6),
  ('Z07', 'FG-SFG',          'Finished Goods', 'Finished and semi-finished goods',     7),
  ('Z08', 'QA-SAMPLE-HOLD',  'Sample',         'Sample, swatch, hold material',        8),
  ('Z09', 'RECEIVING',       '',               'Temporary receiving zone',             9),
  ('Z10', 'DISPATCH',        '',               'Temporary dispatch staging',          10),
  ('Z11', 'SERVICE-REPAIR',  'Asset',          'Items out for service / repair / RTV', 11)
on conflict (code) do update
  set name = excluded.name,
      default_category = excluded.default_category,
      purpose = excluded.purpose,
      display_order = excluded.display_order;
