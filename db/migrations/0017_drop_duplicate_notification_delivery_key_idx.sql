-- Migration 0017: Drop duplicate unique index on notifications(delivery_key)
-- notifications_delivery_key_unique_idx already enforces uniqueness cleanly on the column.

DROP INDEX IF EXISTS "public"."notifications_delivery_key_full_unique_idx";
