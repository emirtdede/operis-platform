-- Migration 0013: Enable Row Level Security (RLS) on all public tables and lockdown PostgREST access

-- 1. Enable RLS on all 34 tables in the public schema
ALTER TABLE "public"."admin_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."category_follows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."category_translations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."endorsements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."engagement_completion_marks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."engagements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."export_job_parts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."export_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."idempotency_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ip_blocks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."legal_acceptances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."legal_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listing_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listing_status_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listing_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."maintenance_identity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notification_fanout_progress" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offer_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."otp_challenges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."outbox_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profile_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_private_identity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

-- 2. Defense-in-depth: Revoke public privileges from PostgREST roles (anon, authenticated)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM authenticated;
  END IF;
END $$;
