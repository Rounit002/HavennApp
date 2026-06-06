-- Migration to add branch_access column to users table
-- This enables staff members to be assigned access to specific branches

-- Add branch_access column to users table
-- This will store an array of branch IDs that the user has access to
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_access INTEGER[] DEFAULT '{}';

-- Create index for better performance when querying by branch access
CREATE INDEX IF NOT EXISTS idx_users_branch_access ON users USING GIN (branch_access);

-- Add comment to document the column purpose
COMMENT ON COLUMN users.branch_access IS 'Array of branch IDs that the user has access to. Empty array means no branch restrictions (admin access).';

-- Update existing users to have empty branch_access array if NULL
UPDATE users SET branch_access = '{}' WHERE branch_access IS NULL;
