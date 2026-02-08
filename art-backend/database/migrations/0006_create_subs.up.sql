CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "subscription_type_id" INTEGER NOT NULL REFERENCES "subscription_types"("id"),
  
  "start_date" TIMESTAMP NOT NULL,
  "end_date" TIMESTAMP NOT NULL,              
  "visits_total" INTEGER NOT NULL,            
  "visits_used" INTEGER NOT NULL DEFAULT 0,
  
  "price_paid" INTEGER NOT NULL,              
  
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP NULL
);

CREATE TABLE "sub_kids" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "age" INTEGER NOT NULL CHECK ("age" >= 3 AND "age" <= 18),
  "gender" VARCHAR(20) NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW(),
  "deleted_at" TIMESTAMP NULL
);

CREATE TABLE "subscription_kids" (
  "subscription_id" INTEGER REFERENCES "subscriptions"("id") ON DELETE CASCADE,
  "sub_kid_id" INTEGER REFERENCES "sub_kids"("id") ON DELETE CASCADE,
  PRIMARY KEY ("subscription_id", "sub_kid_id")
);

CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions" ("user_id");

