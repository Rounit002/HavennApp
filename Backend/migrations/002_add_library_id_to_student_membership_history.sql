-- Migration: Add library_id column to student_membership_history table
-- This fixes the "column smh.library_id does not exist" error

-- Add library_id column to student_membership_history table
ALTER TABLE student_membership_history 
ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_student_membership_history_library 
ON student_membership_history(library_id);

-- Update existing records to have library_id based on the student's library_id
-- This assumes that students table already has library_id column
UPDATE student_membership_history smh
SET library_id = s.library_id
FROM students s
WHERE smh.student_id = s.id
AND smh.library_id IS NULL;

-- Make library_id NOT NULL after updating existing records
ALTER TABLE student_membership_history 
ALTER COLUMN library_id SET NOT NULL;
