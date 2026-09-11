CREATE TABLE "idempotency_keys" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(60) NOT NULL,
	"response_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offer_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"message" text NOT NULL,
	"budget_currency" char(3),
	"budget_min" numeric(18, 2),
	"budget_max" numeric(18, 2),
	"estimated_duration_value" integer,
	"estimated_duration_unit" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_templates" ADD CONSTRAINT "offer_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_keys_user_action_idx" ON "idempotency_keys" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "offer_templates_user_idx" ON "offer_templates" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "listing_revisions_uniq_idx" ON "listing_revisions" USING btree ("listing_id","revision_no");--> statement-breakpoint
CREATE UNIQUE INDEX "offer_revisions_uniq_idx" ON "offer_revisions" USING btree ("offer_id","revision_no");