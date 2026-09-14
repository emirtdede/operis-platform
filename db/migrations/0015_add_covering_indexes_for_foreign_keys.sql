-- Migration 0015: Add covering indexes for foreign keys to eliminate unindexed_foreign_keys linter warnings and optimize cascading joins

CREATE INDEX IF NOT EXISTS "admin_audit_log_admin_user_id_idx" ON "public"."admin_audit_log" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "blocks_blocked_user_id_idx" ON "public"."blocks" ("blocked_user_id");
CREATE INDEX IF NOT EXISTS "category_follows_category_id_idx" ON "public"."category_follows" ("category_id");
CREATE INDEX IF NOT EXISTS "endorsements_author_user_id_idx" ON "public"."endorsements" ("author_user_id");
CREATE INDEX IF NOT EXISTS "engagement_completion_marks_user_id_idx" ON "public"."engagement_completion_marks" ("user_id");
CREATE INDEX IF NOT EXISTS "engagements_freelancer_user_id_idx" ON "public"."engagements" ("freelancer_user_id");
CREATE INDEX IF NOT EXISTS "engagements_owner_user_id_idx" ON "public"."engagements" ("owner_user_id");
CREATE INDEX IF NOT EXISTS "ip_blocks_actor_id_idx" ON "public"."ip_blocks" ("actor_id");
CREATE INDEX IF NOT EXISTS "legal_acceptances_user_id_idx" ON "public"."legal_acceptances" ("user_id");
CREATE INDEX IF NOT EXISTS "listing_revisions_editor_user_id_idx" ON "public"."listing_revisions" ("editor_user_id");
CREATE INDEX IF NOT EXISTS "listing_status_events_listing_id_idx" ON "public"."listing_status_events" ("listing_id");
CREATE INDEX IF NOT EXISTS "listing_templates_category_id_idx" ON "public"."listing_templates" ("category_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "public"."notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "reports_assigned_admin_id_idx" ON "public"."reports" ("assigned_admin_id");
CREATE INDEX IF NOT EXISTS "reports_reporter_user_id_idx" ON "public"."reports" ("reporter_user_id");
CREATE INDEX IF NOT EXISTS "security_events_user_id_idx" ON "public"."security_events" ("user_id");
