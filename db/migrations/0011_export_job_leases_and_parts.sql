-- Migration: 0011_export_job_leases_and_parts.sql
-- B26: Expands export_jobs with leases and fencing, creates export_job_parts and maintenance_identity

DO $$
BEGIN
  -- 1. Ensure export_jobs has all required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'format_version'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "format_version" integer NOT NULL DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'attempt_count'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "attempt_count" integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'next_attempt_at'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "next_attempt_at" timestamp with time zone NOT NULL DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'lease_token'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "lease_token" uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'lease_until'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "lease_until" timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'last_progress_at'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "last_progress_at" timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "started_at" timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'snapshot_started_at'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "snapshot_started_at" timestamp with time zone;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'error_code'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "error_code" varchar(64);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'result_attempt'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "result_attempt" integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'export_jobs' AND column_name = 'part_count'
  ) THEN
    ALTER TABLE "export_jobs" ADD COLUMN "part_count" integer;
  END IF;

  -- Ensure file_size_bytes is bigint
  ALTER TABLE "export_jobs" ALTER COLUMN "file_size_bytes" TYPE bigint;

  -- 2. Partial unique index to enforce at most one active export job per user
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'export_jobs' AND indexname = 'export_jobs_one_active_user_idx'
  ) THEN
    CREATE UNIQUE INDEX "export_jobs_one_active_user_idx"
      ON "export_jobs" ("user_id")
      WHERE "status" IN ('PENDING', 'PROCESSING');
  END IF;

  -- 3. Create export_job_parts table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'export_job_parts'
  ) THEN
    CREATE TABLE "export_job_parts" (
      "job_id" uuid NOT NULL REFERENCES "export_jobs"("id") ON DELETE CASCADE,
      "attempt_no" integer NOT NULL,
      "part_no" integer NOT NULL,
      "payload_enc" text NOT NULL,
      "plaintext_sha256" char(64) NOT NULL,
      "byte_length" integer NOT NULL,
      PRIMARY KEY ("job_id", "attempt_no", "part_no")
    );
  END IF;

  -- 4. Create maintenance_identity singleton table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'maintenance_identity'
  ) THEN
    CREATE TABLE "maintenance_identity" (
      "is_singleton" boolean PRIMARY KEY DEFAULT true CHECK (is_singleton = true),
      "deployment_id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    );

    INSERT INTO "maintenance_identity" ("is_singleton", "deployment_id")
      VALUES (true, gen_random_uuid())
      ON CONFLICT DO NOTHING;
  END IF;
END $$;
