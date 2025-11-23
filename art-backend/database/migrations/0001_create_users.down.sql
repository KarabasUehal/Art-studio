DROP INDEX IF EXISTS "idx_users_deleted";
DROP INDEX IF EXISTS "idx_users_role";
DROP INDEX IF EXISTS "idx_users_phone_number";
DROP INDEX IF EXISTS "idx_users_username";

DROP TABLE IF EXISTS "users" CASCADE;