-- Add gender column to students table
-- This migration adds support for gender field in student records

-- Add gender column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';

-- Add constraint to ensure only valid gender values
ALTER TABLE students ADD CONSTRAINT students_gender_check 
  CHECK (gender IN ('male', 'female', '') OR gender IS NULL);

-- Add comment to document the column
COMMENT ON COLUMN students.gender IS 'Student gender: male, female, or empty string for N/A';

-- Update existing records to have default gender value
UPDATE students SET gender = 'male' WHERE gender IS NULL;
