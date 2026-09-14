-- Migration: 0008_delivery_key_and_export_jobs.sql
-- B16: Adds unique delivery_key to notifications table to guarantee deduplication at the DB level.
-- B26: Creates export_jobs table for persistent asynchronous KVKK/GDPR data export jobs.

DO $$
BEGIN
  -- 1. Add delivery_key to notifications table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'delivery_key'
  ) THEN
    ALTER TABLE "notifications" ADD COLUMN "delivery_key" varchar(191);
  END IF;

  -- 2. Add unique index on notifications(delivery_key)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'notifications' AND indexname = 'notifications_delivery_key_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX "notifications_delivery_key_unique_idx"
      ON "notifications" ("delivery_key")
      WHERE "delivery_key" IS NOT NULL;
  END IF;

  -- 3. Create export_jobs table if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'export_jobs'
  ) THEN
    CREATE TABLE "export_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "status" varchar(30) NOT NULL DEFAULT 'PENDING',
      "progress" integer NOT NULL DEFAULT 0,
      "manifest_json" jsonb,
      "file_content" text,
      "checksum_sha256" varchar(64),
      "file_size_bytes" integer,
      "error_message" text,
      "expires_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "completed_at" timestamp with time zone
    );

    CREATE INDEX "export_jobs_user_status_created_idx"
      ON "export_jobs" ("user_id", "status", "created_at" DESC);
  END IF;
END $$;
