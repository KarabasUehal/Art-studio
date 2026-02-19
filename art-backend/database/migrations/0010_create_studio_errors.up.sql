CREATE TABLE IF NOT EXISTS "studio_errors" (
    "id" SERIAL PRIMARY KEY,
    "subscription_id" INTEGER NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "info" VARCHAR(1000),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);
