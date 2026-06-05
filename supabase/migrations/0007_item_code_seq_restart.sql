-- The master was re-seeded up to ITM-04844, but item_code_seq still starts at
-- 2028 (from 0001, when the master ended at ITM-02027). Left as-is, next_item_code()
-- would hand out ITM-02028… which now collide with real master codes.
-- Restart the sequence so newly assigned codes begin at ITM-04845.
alter sequence item_code_seq restart with 4845;
