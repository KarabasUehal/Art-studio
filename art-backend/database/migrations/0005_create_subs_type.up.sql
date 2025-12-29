CREATE TABLE IF NOT EXISTS "subscription_types" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "activity_id" INTEGER NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
  "price" INTEGER NOT NULL,
  "visits_count" INTEGER NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "is_active" BOOLEAN DEFAULT TRUE,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP NULL,
  CONSTRAINT uq_activity_name UNIQUE ("activity_id", "name")
);

CREATE INDEX IF NOT EXISTS idx_subscription_types_activity_id ON subscription_types(activity_id);
CREATE INDEX IF NOT EXISTS idx_subscription_types_active ON subscription_types(is_active) WHERE is_active = true;