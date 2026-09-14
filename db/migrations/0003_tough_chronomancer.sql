CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"locale" varchar(5) DEFAULT 'tr' NOT NULL,
	"ip_address" varchar(64),
	"status" varchar(30) DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "engagements" DROP CONSTRAINT "engagements_listing_id_unique";--> statement-breakpoint
ALTER TABLE "engagements" DROP CONSTRAINT "engagements_accepted_offer_id_unique";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "two_factor_backup_codes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_active_listing_idx" ON "engagements" USING btree ("listing_id") WHERE "engagements"."status" != 'CANCELLED';--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_active_accepted_offer_idx" ON "engagements" USING btree ("accepted_offer_id") WHERE "engagements"."status" != 'CANCELLED';