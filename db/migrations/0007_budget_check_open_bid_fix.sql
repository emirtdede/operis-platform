-- Migration: 0007_budget_check_open_bid_fix.sql
-- Enforces null or positive budget min/max for OPEN_BID listings in listings_budget_integrity_chk constraint.

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

  -- Add updated check constraint with strict OPEN_BID conditions
  ALTER TABLE "listings" ADD CONSTRAINT "listings_budget_integrity_chk"
    CHECK (
      status = 'DRAFT'
      OR (budget_mode = 'EXACT' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min = budget_max AND budget_min > 0 AND budget_currency IS NOT NULL)
      OR (budget_mode = 'RANGE' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min > 0 AND budget_max >= budget_min AND budget_currency IS NOT NULL)
      OR (budget_mode = 'OPEN_BID' AND (budget_min IS NULL OR budget_min > 0) AND (budget_max IS NULL OR budget_max > 0) AND (budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min))
    );
END $$;
