-- ==========================================
-- PANJRAPOLE - Fix: missing table-level grants
-- Run this once in Supabase SQL Editor, AFTER schema.sql.
--
-- schema.sql was run via the SQL Editor, which (unlike the Table Editor)
-- does not automatically grant basic read/write access to the anon/
-- authenticated roles - so even though every Row Level Security policy
-- was in place, logged-in users had zero underlying table permissions at
-- all, causing "permission denied for table ..." errors. RLS still fully
-- controls which ROWS are visible/writable; these grants just allow the
-- operation to be attempted in the first place.
-- ==========================================

grant select, insert on pj_profiles to authenticated;
grant select on pj_heads to authenticated;
grant insert, update on pj_heads to authenticated;
grant select on pj_settings to authenticated;
grant select on pj_receipt_counter to authenticated;
grant select on pj_receipts to authenticated;
grant select on pj_receipt_items to authenticated;
