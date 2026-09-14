-- Migration: 0009_notification_delivery_key_conflict_fix.sql
-- B16: Ensures unambiguous UNIQUE index on notifications(delivery_key) for PostgreSQL ON CONFLICT support
-- Compatible with both partial index environments and clean installations.

DO $$
BEGIN
  -- Create full unique index if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'notifications' AND indexname = 'notifications_delivery_key_full_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX "notifications_delivery_key_full_unique_idx"
      ON "notifications" ("delivery_key");
  END IF;
END $$;
