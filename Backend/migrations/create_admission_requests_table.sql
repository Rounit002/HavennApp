-- Migration: Create admission_requests table for public student registration
-- This table stores student registration requests before admin approval

CREATE TABLE IF NOT EXISTS admission_requests (
    id SERIAL PRIMARY KEY,
    library_id INTEGER NOT NULL,
    
    -- Student Information (matching students table structure)
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(15) NOT NULL,
    address TEXT,
    registration_number VARCHAR(50),
    father_name VARCHAR(255),
    aadhar_number VARCHAR(20),
    
    -- Membership Details
    branch_id INTEGER,
    membership_start DATE,
    membership_end DATE,
    total_fee NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    due_amount NUMERIC DEFAULT 0,
    cash NUMERIC DEFAULT 0,
    online NUMERIC DEFAULT 0,
    security_money NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    
    -- Additional Fields
    remark TEXT,
    profile_image_url TEXT,
    aadhaar_front_url TEXT,
    aadhaar_back_url TEXT,
    
    -- Seat and Shift (stored as JSON for flexibility)
    shift_ids TEXT, -- JSON array of shift IDs
    seat_id INTEGER,
    locker_id INTEGER,
    
    -- Request Status and Metadata
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITHOUT TIME ZONE,
    processed_by INTEGER, -- user_id who processed the request
    rejection_reason TEXT,
    
    -- Foreign Key Constraints
    FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE SET NULL,
    FOREIGN KEY (locker_id) REFERENCES locker(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admission_requests_library_id ON admission_requests(library_id);
CREATE INDEX IF NOT EXISTS idx_admission_requests_status ON admission_requests(status);
CREATE INDEX IF NOT EXISTS idx_admission_requests_created_at ON admission_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admission_requests_phone ON admission_requests(phone);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_admission_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admission_requests_updated_at
    BEFORE UPDATE ON admission_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_admission_requests_updated_at();
