CREATE TABLE IF NOT EXISTS "activity_slots" (
    "id" SERIAL PRIMARY KEY,
    "activity_id" INTEGER NOT NULL REFERENCES "activities"("id") ON DELETE CASCADE,
    "start_time" TIMESTAMP NOT NULL,
    "end_time" TIMESTAMP NOT NULL,
    "capacity" INTEGER NOT NULL CHECK ("capacity" > 0),
    "booked" INTEGER NOT NULL DEFAULT 0 CHECK ("booked" >= 0),
    "template_id" BIGINT NULL REFERENCES "schedule_templates"("id") ON DELETE SET NULL,
    "source" VARCHAR(20) NOT NULL DEFAULT 'template',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS "idx_activity_slots_activity_id" ON "activity_slots" ("activity_id");
CREATE INDEX IF NOT EXISTS "idx_activity_slots_start_time" ON "activity_slots" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_activity_slots_deleted" ON "activity_slots" ("deleted_at");

CREATE INDEX IF NOT EXISTS "idx_activity_slots_template_id"  ON "activity_slots" ("template_id");

CREATE UNIQUE INDEX "idx_activity_slots_unique" ON "activity_slots" ("activity_id", "start_time") WHERE deleted_at IS NULL;