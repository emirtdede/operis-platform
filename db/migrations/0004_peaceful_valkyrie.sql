ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" varchar(40) NOT NULL,
	"target_phone_hmac" text,
	"code_digest" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "ip_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"reason" varchar(255),
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purpose" varchar(60) NOT NULL,
	"subject_digest" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "otp_challenges" ADD CONSTRAINT "otp_challenges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ip_blocks" ADD CONSTRAINT "ip_blocks_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_challenges_user_purpose_idx" ON "otp_challenges" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "otp_challenges_expires_idx" ON "otp_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "ip_blocks_ip_idx" ON "ip_blocks" USING btree ("ip");--> statement-breakpoint
CREATE INDEX "ip_blocks_revoked_expires_idx" ON "ip_blocks" USING btree ("revoked_at","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_purpose_subject_window_idx" ON "rate_limits" USING btree ("purpose","subject_digest","window_start");--> statement-breakpoint
CREATE INDEX "rate_limits_expires_idx" ON "rate_limits" USING btree ("expires_at");
