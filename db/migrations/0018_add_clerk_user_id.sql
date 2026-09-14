-- Migration 0018: Add clerk_user_id column to users table with unique index
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_user_id" varchar(255);

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_unique_idx" 
ON "users" ("clerk_user_id") 
WHERE "clerk_user_id" IS NOT NULL;
