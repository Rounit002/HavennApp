-- 010_add_google_play_fields.sql
-- Adds Google Play subscription fields to libraries table

-- Ensure table exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'libraries'
  ) THEN
    RAISE EXCEPTION 'Table "libraries" does not exist. Run base migrations first.';
  END IF;
END $$;

-- Add columns if they do not already exist
ALTER TABLE IF EXISTS libraries
  ADD COLUMN IF NOT EXISTS google_play_purchase_token TEXT,
  ADD COLUMN IF NOT EXISTS google_play_product_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS google_play_subscription_id VARCHAR(255);

-- If your schema does NOT already include subscription columns, uncomment below:
-- ALTER TABLE IF EXISTS libraries
--   ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32),
--   ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(64),
--   ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;

-- Index to speed up lookups by purchase token (webhook updates)
CREATE INDEX IF NOT EXISTS idx_libraries_google_play_purchase_token ON libraries(google_play_purchase_token);
