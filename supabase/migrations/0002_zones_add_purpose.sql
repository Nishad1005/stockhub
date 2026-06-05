-- Add the zones.purpose column to restore v0.1 parity.
-- v0.1 (legacy/UM_Designs_StockHub.html, const ZONES) carries a `purpose`
-- string per zone, shown in the UI. The initial schema dropped it; this
-- migration restores it. Values are populated by supabase/seed/zones.sql.
alter table zones add column if not exists purpose text;
