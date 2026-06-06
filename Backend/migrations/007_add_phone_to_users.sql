-- Migration to add phone column to users table for forgot password functionality
-- This enables staff/admin users to reset passwords using email and phone verification

-- Add phone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create index for better performance when querying by phone
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Add comment to document the column purpose
COMMENT ON COLUMN users.phone IS 'Phone number for user verification and password reset functionality';
