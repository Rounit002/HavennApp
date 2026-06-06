-- Add branch_id column to schedules table
ALTER TABLE schedules ADD COLUMN branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE;

-- Update existing schedules to use the first branch of the library (or NULL if no branches exist)
-- This is a one-time migration for existing data
UPDATE schedules s
SET branch_id = (SELECT id FROM branches WHERE library_id = s.library_id ORDER BY id LIMIT 1);

-- Make the column NOT NULL after updating existing data
ALTER TABLE schedules ALTER COLUMN branch_id SET NOT NULL;
