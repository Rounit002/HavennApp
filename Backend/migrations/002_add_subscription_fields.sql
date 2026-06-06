-- Migration to add subscription fields to libraries table
ALTER TABLE libraries 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free_trial',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_subscription_active BOOLEAN DEFAULT true;
