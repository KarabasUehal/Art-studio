CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "username" VARCHAR(50) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL UNIQUE,
    "role" VARCHAR(20) NOT NULL DEFAULT 'client',
    "name" VARCHAR(100),
    "subscription_is_sub" BOOLEAN NOT NULL DEFAULT false,
    "subscription_sub_duration" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS "idx_users_username" ON "users" ("username");
CREATE INDEX IF NOT EXISTS "idx_users_phone_number" ON "users" ("phone_number");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");
CREATE INDEX IF NOT EXISTS "idx_users_deleted" ON "users" ("deleted_at");