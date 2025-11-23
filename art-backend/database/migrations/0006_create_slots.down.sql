DROP INDEX IF EXISTS "idx_activity_slots_activity_id";
DROP INDEX IF EXISTS "idx_activity_slots_start_time";
DROP INDEX IF EXISTS "idx_activity_slots_deleted";
DROP TABLE IF EXISTS "activity_slots" CASCADE;