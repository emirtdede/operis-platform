-- Migration: 0012_budget_modes_comprehensive_chk.sql
-- Synchronizes listings_budget_integrity_chk constraint with all valid budget modes from UI wizard
-- (FIXED_EXACT, FIXED_RANGE, HOURLY_EXACT, HOURLY_RANGE, NEGOTIABLE, REQUEST_GUIDANCE, EXACT, RANGE, OPEN_BID)

DO $$
BEGIN
  -- Drop previous constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_budget_integrity_chk'
      AND conrelid = 'listings'::regclass
  ) THEN
    ALTER TABLE "listings" DROP CONSTRAINT "listings_budget_integrity_chk";
  END IF;

  -- Add comprehensive check constraint supporting both canonical and wizard modes
  ALTER TABLE "listings" ADD CONSTRAINT "listings_budget_integrity_chk"
    CHECK (
      status = 'DRAFT'
      OR (budget_mode IN ('EXACT', 'FIXED_EXACT', 'HOURLY_EXACT') AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min = budget_max AND budget_min > 0 AND budget_currency IS NOT NULL)
      OR (budget_mode IN ('RANGE', 'FIXED_RANGE', 'HOURLY_RANGE') AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min > 0 AND budget_max >= budget_min AND budget_currency IS NOT NULL)
      OR (budget_mode IN ('OPEN_BID', 'NEGOTIABLE', 'REQUEST_GUIDANCE') AND (budget_min IS NULL OR budget_min > 0) AND (budget_max IS NULL OR budget_max > 0) AND (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min))
    );
END $$;
