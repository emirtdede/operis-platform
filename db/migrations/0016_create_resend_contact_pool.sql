-- Migration 0016: Create resend_contact_pool table with RLS and covering indexes for dynamic 1000-seat pool management

CREATE TABLE IF NOT EXISTS "public"."resend_contact_pool" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  "resend_contact_id" varchar(100),
  "consent_given_at" timestamp with time zone DEFAULT now() NOT NULL,
  "synced_at" timestamp with time zone,
  "unsubscribed_at" timestamp with time zone,
  "bounced_at" timestamp with time zone,
  "bounce_reason" text,
  "last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "resend_contact_pool_user_id_unique" UNIQUE("user_id")
);

-- Covering indexes
CREATE INDEX IF NOT EXISTS "resend_contact_pool_user_id_idx" ON "public"."resend_contact_pool" ("user_id");
CREATE INDEX IF NOT EXISTS "resend_contact_pool_status_active_idx" ON "public"."resend_contact_pool" ("status", "last_active_at" DESC);
CREATE INDEX IF NOT EXISTS "resend_contact_pool_email_idx" ON "public"."resend_contact_pool" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "resend_contact_pool_resend_id_idx" ON "public"."resend_contact_pool" ("resend_contact_id") WHERE "resend_contact_id" IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."resend_contact_pool" ENABLE ROW LEVEL SECURITY;

-- Management policy for service_role
CREATE POLICY "service_role_manage_all" ON "public"."resend_contact_pool"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
