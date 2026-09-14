-- Migration 0014: Add service_role management RLS policies on all public tables to resolve rls_enabled_no_policy

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'admin_audit_log',
    'blocks',
    'categories',
    'category_follows',
    'category_translations',
    'contact_messages',
    'endorsements',
    'engagement_completion_marks',
    'engagements',
    'export_job_parts',
    'export_jobs',
    'idempotency_keys',
    'ip_blocks',
    'legal_acceptances',
    'legal_documents',
    'listing_revisions',
    'listing_status_events',
    'listing_templates',
    'listings',
    'maintenance_identity',
    'notification_fanout_progress',
    'notifications',
    'offer_revisions',
    'offer_templates',
    'offers',
    'otp_challenges',
    'outbox_events',
    'profile_links',
    'profiles',
    'rate_limits',
    'reports',
    'security_events',
    'user_private_identity',
    'users'
  ];
BEGIN
  -- Grant service_role full management privileges
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_manage_all" ON "public".%I;', tbl);
    EXECUTE format('CREATE POLICY "service_role_manage_all" ON "public".%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl);
  END LOOP;
END $$;
