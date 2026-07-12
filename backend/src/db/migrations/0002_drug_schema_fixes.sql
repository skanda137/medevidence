-- 0002_drug_schema_fixes.sql
-- The FDA retired the A/B/C/D/X pregnancy category letter system in 2015
-- (Pregnancy and Lactation Labeling Rule). Storing it as a field ships a
-- deprecated standard on day one. Replace with a narrative risk-summary
-- field, consistent with how pregnancy/lactation risk is actually
-- communicated post-PLLR.

ALTER TABLE drugs RENAME COLUMN pregnancy_category TO pregnancy_lactation_summary;
ALTER TABLE drugs ALTER COLUMN pregnancy_lactation_summary TYPE TEXT;

COMMENT ON COLUMN drugs.pregnancy_lactation_summary IS
  'Narrative risk summary (post-2015 PLLR style) — never a letter category.';
