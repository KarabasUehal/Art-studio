DROP INDEX IF EXISTS "idx_details_activity_id";
DROP INDEX IF EXISTS "idx_records_deleted";
DROP INDEX IF EXISTS "idx_records_created_at";
DROP INDEX IF EXISTS "idx_records_user_id";

DROP TABLE IF EXISTS "records" CASCADE;