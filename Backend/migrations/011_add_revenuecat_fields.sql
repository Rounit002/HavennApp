-- 011_add_revenuecat_fields.sql
-- Ensures the columns used by the RevenueCat sync/webhook exist on `libraries`.
-- Safe to run multiple times.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'libraries'
  ) THEN
    RAISE EXCEPTION 'Table "libraries" does not exist. Run base migrations first.';
  END IF;
END $$;

ALTER TABLE IF EXISTS libraries
  -- Used by both the Google Play and RevenueCat sync routes for the expiry time.
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
  -- Stores the RevenueCat App User ID (havenn_<libraryId>) for cross-referencing.
  ADD COLUMN IF NOT EXISTS revenuecat_app_user_id VARCHAR(255);
