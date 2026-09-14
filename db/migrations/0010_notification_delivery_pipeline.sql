-- Migration: 0010_notification_delivery_pipeline.sql
-- B16: Adds delivery_key to outbox_events with unique index and creates notification_fanout_progress table

DO $$
BEGIN
  -- 1. Add delivery_key to outbox_events if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outbox_events' AND column_name = 'delivery_key'
  ) THEN
    ALTER TABLE "outbox_events" ADD COLUMN "delivery_key" varchar(191);
  END IF;

  -- 2. Add unique index on outbox_events(delivery_key)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'outbox_events' AND indexname = 'outbox_delivery_key_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX "outbox_delivery_key_unique_idx"
      ON "outbox_events" ("delivery_key");
  END IF;

  -- 3. Create notification_fanout_progress table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'notification_fanout_progress'
  ) THEN
    CREATE TABLE "notification_fanout_progress" (
      "event_id" uuid PRIMARY KEY REFERENCES "outbox_events"("id") ON DELETE CASCADE,
      "phase" varchar(16) NOT NULL CHECK (phase IN ('RADAR', 'CATEGORY', 'DONE')),
      "last_user_id" uuid,
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );
  END IF;
END $$;
