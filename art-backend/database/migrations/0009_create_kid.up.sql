CREATE TABLE IF NOT EXISTS "user_kids" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100),
    "age" INTEGER NOT NULL CHECK ("age" >= 3),
    "gender" VARCHAR(20),
    "parent_name" VARCHAR(100) NOT NULL,
    "parent_surname" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

CREATE UNIQUE INDEX unique_kid_name_age_user_active
ON user_kids ("name", "age", "user_id")
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS "idx_user_kids_user_id" ON "user_kids" ("user_id");