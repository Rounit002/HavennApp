-- Create student_attendance table for barcode-based attendance system
CREATE TABLE IF NOT EXISTS student_attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    library_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('in', 'out')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_student_attendance_student 
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_attendance_library 
        FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_library 
    ON student_attendance(student_id, library_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date 
    ON student_attendance(created_at::date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date 
    ON student_attendance(student_id, created_at::date);

-- Add comment to table
COMMENT ON TABLE student_attendance IS 'Stores student attendance records with toggle-based in/out tracking';
COMMENT ON COLUMN student_attendance.action IS 'Either "in" for check-in or "out" for check-out';
COMMENT ON COLUMN student_attendance.notes IS 'Optional notes for the attendance record';
