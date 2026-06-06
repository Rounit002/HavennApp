-- Add gender column to student_membership_history table
-- This migration adds support for gender field in student membership history records

-- Add gender column to student_membership_history table
ALTER TABLE student_membership_history ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';

-- Add constraint to ensure only valid gender values
ALTER TABLE student_membership_history ADD CONSTRAINT student_membership_history_gender_check 
  CHECK (gender IN ('male', 'female', '') OR gender IS NULL);

-- Add comment to document the column
COMMENT ON COLUMN student_membership_history.gender IS 'Student gender: male, female, or empty string for N/A';

-- Update existing records to have default gender value
UPDATE student_membership_history SET gender = 'male' WHERE gender IS NULL;
