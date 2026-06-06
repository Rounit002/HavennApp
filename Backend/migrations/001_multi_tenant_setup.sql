-- Multi-tenant Library Management System Database Migration
-- This migration adds support for multiple library owners with isolated data

-- 1. Create libraries table to store library owner information
CREATE TABLE IF NOT EXISTS libraries (
    id SERIAL PRIMARY KEY,
    library_code VARCHAR(20) UNIQUE NOT NULL,
    library_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) UNIQUE NOT NULL,
    owner_phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    -- Subscription fields
    subscription_plan VARCHAR(50) DEFAULT 'free_trial',
    subscription_start_date TIMESTAMP,
    subscription_end_date TIMESTAMP,
    is_trial BOOLEAN DEFAULT true,
    is_subscription_active BOOLEAN DEFAULT true
);

-- 2. Create student_accounts table for student login credentials
CREATE TABLE IF NOT EXISTS student_accounts (
    id SERIAL PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL, -- Will be same as phone number
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(library_id, phone)
);

-- 3. Create attendance table for student attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP,
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Add library_id to existing tables for data isolation
ALTER TABLE students ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;
ALTER TABLE lockers ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_libraries_code ON libraries(library_code);
CREATE INDEX IF NOT EXISTS idx_libraries_email ON libraries(owner_email);
CREATE INDEX IF NOT EXISTS idx_student_accounts_library ON student_accounts(library_id);
CREATE INDEX IF NOT EXISTS idx_student_accounts_phone ON student_accounts(library_id, phone);
CREATE INDEX IF NOT EXISTS idx_attendance_library ON attendance(library_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_students_library ON students(library_id);
CREATE INDEX IF NOT EXISTS idx_users_library ON users(library_id);
CREATE INDEX IF NOT EXISTS idx_seats_library ON seats(library_id);
CREATE INDEX IF NOT EXISTS idx_schedules_library ON schedules(library_id);
CREATE INDEX IF NOT EXISTS idx_branches_library ON branches(library_id);
CREATE INDEX IF NOT EXISTS idx_transactions_library ON transactions(library_id);
CREATE INDEX IF NOT EXISTS idx_expenses_library ON expenses(library_id);
CREATE INDEX IF NOT EXISTS idx_products_library ON products(library_id);
CREATE INDEX IF NOT EXISTS idx_lockers_library ON lockers(library_id);

-- 6. Create function to generate unique library codes
CREATE OR REPLACE FUNCTION generate_library_code() RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random 8-character code with letters and numbers
        new_code := 'LIB' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM libraries WHERE library_code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_libraries_updated_at
    BEFORE UPDATE ON libraries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Add constraints to ensure data integrity
ALTER TABLE students ADD CONSTRAINT students_library_required 
    CHECK (library_id IS NOT NULL);

-- Note: Existing data will need to be migrated to assign library_id values
-- This should be done carefully in a separate migration script
