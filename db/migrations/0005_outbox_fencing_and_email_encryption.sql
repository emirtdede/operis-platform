ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "lease_token" uuid;
ALTER TABLE "outbox_events" ADD COLUMN IF NOT EXISTS "lease_until" timestamp with time zone;
CREATE INDEX IF NOT EXISTS "idx_outbox_events_status_lease" ON "outbox_events" ("status", "lease_until", "next_attempt_at");

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_enc" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_hmac" varchar(64);
CREATE INDEX IF NOT EXISTS "idx_users_email_hmac" ON "users" ("email_hmac");
