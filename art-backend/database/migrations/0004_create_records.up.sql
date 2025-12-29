CREATE TABLE IF NOT EXISTS "records" (
    "id" SERIAL PRIMARY KEY,
    "user_id" INTEGER NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "details" jsonb NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "parent_name" TEXT,
    "total_price" REAL NOT NULL CHECK ("total_price" >= 0),
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP NULL
);

/* Индексы для скорости (по user_id для "моих записей", по created_at для сортировки) */
CREATE INDEX IF NOT EXISTS "idx_user_id" ON "records" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_created_at" ON "records" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_deleted" ON "records" ("deleted_at");

/* FK на users (CASCADE для удаления записей при удалении пользователя) */
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_records_user'
    ) THEN
        ALTER TABLE "records"
        ADD CONSTRAINT "fk_records_user"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

/* Индекс для JSONB */
CREATE INDEX IF NOT EXISTS "idx_details_gin" ON "records" USING GIN ("details");