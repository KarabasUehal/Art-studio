CREATE TABLE IF NOT EXISTS "schedule_templates" (
    "id" SERIAL PRIMARY KEY,
    "activity_id" INTEGER NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
    "day_of_week" INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
    "start_time" VARCHAR(5) NOT NULL,
    "capacity" INTEGER NOT NULL CHECK (capacity > 0) DEFAULT 10,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_template
ON schedule_templates (activity_id, day_of_week, start_time);

    