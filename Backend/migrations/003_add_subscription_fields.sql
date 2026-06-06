-- Add subscription fields to libraries table
ALTER TABLE libraries 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(50) DEFAULT 'free_trial',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_subscription_active BOOLEAN DEFAULT true;

-- Create index for better performance on subscription fields
CREATE INDEX IF NOT EXISTS idx_libraries_subscription_plan ON libraries(subscription_plan);
CREATE INDEX IF NOT EXISTS idx_libraries_subscription_end_date ON libraries(subscription_end_date);
