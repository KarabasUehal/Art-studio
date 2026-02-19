CREATE TABLE IF NOT EXISTS "activities" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "images" jsonb NOT NULL,
    "price" INTEGER NOT NULL CHECK ("price" >= 0),
    "available_slots" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL CHECK ("duration" > 0),
    "is_regular" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS "idx_deleted" ON "activities" ("deleted_at");
    