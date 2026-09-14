DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'listings_budget_integrity_chk'
  ) THEN
    ALTER TABLE "listings" ADD CONSTRAINT "listings_budget_integrity_chk" 
    CHECK (
      status = 'DRAFT' 
      OR budget_mode = 'OPEN_BID' 
      OR (budget_mode = 'EXACT' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min = budget_max AND budget_min > 0 AND budget_currency IS NOT NULL) 
      OR (budget_mode = 'RANGE' AND budget_min IS NOT NULL AND budget_max IS NOT NULL AND budget_min > 0 AND budget_max >= budget_min AND budget_currency IS NOT NULL)
    );
  END IF;
END $$;
