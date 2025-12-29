CREATE TABLE IF NOT EXISTS "user_kids" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100),
    "age" INTEGER NOT NULL CHECK ("age" >= 3),
    "gender" VARCHAR(20),
    "parent_name" VARCHAR(100),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL,
    CONSTRAINT "unique_kid_name_age_user" UNIQUE ("name", "age", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_user_kids_user_id" ON "user_kids" ("user_id");