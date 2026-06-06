-- Consolidated schema for Havenn (all tables used by the application)

-- 1) Core: libraries
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
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  subscription_status VARCHAR(32),
  subscription_plan VARCHAR(50) DEFAULT 'free_trial',
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  is_trial BOOLEAN DEFAULT true,
  is_subscription_active BOOLEAN DEFAULT true,
  google_play_purchase_token TEXT,
  google_play_product_id VARCHAR(255),
  google_play_subscription_id VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_libraries_code ON libraries(library_code);
CREATE INDEX IF NOT EXISTS idx_libraries_email ON libraries(owner_email);
CREATE INDEX IF NOT EXISTS idx_libraries_google_play_purchase_token ON libraries(google_play_purchase_token);

-- common updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Branches
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_branches_library ON branches(library_id);

-- 3) Users (admin/staff)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','staff')),
  full_name VARCHAR(255),
  email VARCHAR(255),
  permissions TEXT[] DEFAULT '{}',
  branch_access INTEGER[] DEFAULT '{}',
  phone VARCHAR(20),
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  UNIQUE (username, library_id)
);
CREATE INDEX IF NOT EXISTS idx_users_library ON users(library_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_branch_access ON users USING GIN (branch_access);

-- 4) Seats
CREATE TABLE IF NOT EXISTS seats (
  id SERIAL PRIMARY KEY,
  seat_number VARCHAR(50) NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_seats_library ON seats(library_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_seats_per_branch ON seats(library_id, COALESCE(branch_id, -1), seat_number);

-- 5) Schedules (shifts)
CREATE TABLE IF NOT EXISTS schedules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  time VARCHAR(10),
  event_date DATE,
  fee NUMERIC DEFAULT 0,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_schedules_library ON schedules(library_id);

-- 6) Locker (singular)
CREATE TABLE IF NOT EXISTS locker (
  id SERIAL PRIMARY KEY,
  locker_number VARCHAR(50) NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  is_assigned BOOLEAN DEFAULT FALSE,
  student_id INTEGER,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_locker_library ON locker(library_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_locker_per_branch ON locker(branch_id, locker_number);

-- 7) Students
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  gender VARCHAR(10) DEFAULT 'male',
  membership_start DATE NOT NULL,
  membership_end DATE NOT NULL,
  total_fee NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  cash NUMERIC DEFAULT 0,
  online NUMERIC DEFAULT 0,
  security_money NUMERIC DEFAULT 0,
  remark TEXT,
  profile_image_url TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired')),
  locker_id INTEGER REFERENCES locker(id) ON DELETE SET NULL,
  registration_number VARCHAR(50),
  father_name VARCHAR(255),
  aadhar_number VARCHAR(20),
  discount NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  CONSTRAINT students_gender_check CHECK (gender IN ('male','female','') OR gender IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_students_library ON students(library_id);
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_membership_end ON students(membership_end);

-- 8) Seat assignments (seat x schedule per student)
CREATE TABLE IF NOT EXISTS seat_assignments (
  id SERIAL PRIMARY KEY,
  seat_id INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  shift_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (seat_id, shift_id)
);

-- 9) Attendance (legacy)
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP,
  date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present','absent','late')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attendance_library ON attendance(library_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- 10) Student attendance (barcode in/out log)
CREATE TABLE IF NOT EXISTS student_attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  action VARCHAR(10) NOT NULL CHECK (action IN ('in', 'out')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_library ON student_attendance(student_id, library_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON student_attendance((created_at::date));
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_date ON student_attendance(student_id, (created_at::date));

-- 11) Student membership history
CREATE TABLE IF NOT EXISTS student_membership_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  gender VARCHAR(10) DEFAULT 'male',
  membership_start DATE,
  membership_end DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired')),
  total_fee NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  cash NUMERIC DEFAULT 0,
  online NUMERIC DEFAULT 0,
  security_money NUMERIC DEFAULT 0,
  remark TEXT,
  seat_id INTEGER REFERENCES seats(id) ON DELETE SET NULL,
  shift_id INTEGER REFERENCES schedules(id) ON DELETE SET NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  registration_number VARCHAR(50),
  father_name VARCHAR(255),
  aadhar_number VARCHAR(20),
  profile_image_url TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  locker_id INTEGER REFERENCES locker(id) ON DELETE SET NULL,
  discount NUMERIC DEFAULT 0,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  CONSTRAINT student_membership_history_gender_check CHECK (gender IN ('male','female','') OR gender IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_smh_library ON student_membership_history(library_id);
CREATE INDEX IF NOT EXISTS idx_smh_branch ON student_membership_history(branch_id);
CREATE INDEX IF NOT EXISTS idx_smh_changed_at ON student_membership_history(changed_at);

-- 12) Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cash_receipt NUMERIC DEFAULT 0,
  online_receipt NUMERIC DEFAULT 0,
  cash_expense NUMERIC DEFAULT 0,
  online_expense NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_transactions_library ON transactions(library_id);

-- 13) Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  remark TEXT,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_expenses_library ON expenses(library_id);

-- 14) Products
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_products_library ON products(library_id);

-- 15) Settings (key/value)
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

-- 16) Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  is_global BOOLEAN DEFAULT FALSE,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17) Public Queries feature
CREATE TABLE IF NOT EXISTS queries (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'Posted' CHECK (status IN ('Posted', 'Approved', 'Not Approved', 'Done', 'Not Done')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_queries_library_id ON queries(library_id);
CREATE INDEX IF NOT EXISTS idx_queries_student_id ON queries(student_id);

CREATE TABLE IF NOT EXISTS query_votes (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  vote_type VARCHAR(4) NOT NULL CHECK (vote_type IN ('up','down')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(query_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_query_votes_library_id ON query_votes(library_id);
CREATE INDEX IF NOT EXISTS idx_query_votes_query_id ON query_votes(query_id);
CREATE INDEX IF NOT EXISTS idx_query_votes_student_id ON query_votes(student_id);

CREATE TABLE IF NOT EXISTS query_comments (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  query_id INTEGER NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  commenter_id INTEGER NOT NULL,
  commenter_role VARCHAR(10) NOT NULL CHECK (commenter_role IN ('student','admin')),
  comment_text TEXT NOT NULL,
  parent_comment_id INTEGER REFERENCES query_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_query_comments_library_id ON query_comments(library_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id);

-- queries updated_at trigger
DROP TRIGGER IF EXISTS update_queries_updated_at ON queries;
CREATE TRIGGER update_queries_updated_at
BEFORE UPDATE ON queries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 18) Admission requests (public registration)
CREATE TABLE IF NOT EXISTS admission_requests (
  id SERIAL PRIMARY KEY,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(15) NOT NULL,
  address TEXT,
  registration_number VARCHAR(50),
  father_name VARCHAR(255),
  aadhar_number VARCHAR(20),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  membership_start DATE,
  membership_end DATE,
  total_fee NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  cash NUMERIC DEFAULT 0,
  online NUMERIC DEFAULT 0,
  security_money NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  remark TEXT,
  profile_image_url TEXT,
  aadhaar_front_url TEXT,
  aadhaar_back_url TEXT,
  shift_ids TEXT,
  seat_id INTEGER REFERENCES seats(id) ON DELETE SET NULL,
  locker_id INTEGER REFERENCES locker(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  processed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_admission_requests_library_id ON admission_requests(library_id);
CREATE INDEX IF NOT EXISTS idx_admission_requests_status ON admission_requests(status);
CREATE INDEX IF NOT EXISTS idx_admission_requests_created_at ON admission_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_admission_requests_phone ON admission_requests(phone);

-- 19) Advance payments
CREATE TABLE IF NOT EXISTS advance_payments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(255),
  branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  branch_name VARCHAR(255),
  membership_expiry DATE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  notes TEXT,
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_advance_payments_library ON advance_payments(library_id);

-- 20) Hostel: branches, students, history
CREATE TABLE IF NOT EXISTS hostel_branches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hostel_branches_library ON hostel_branches(library_id);

CREATE TABLE IF NOT EXISTS hostel_students (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES hostel_branches(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  father_name VARCHAR(255),
  mother_name VARCHAR(255),
  aadhar_number VARCHAR(20),
  phone_number VARCHAR(15),
  profile_image_url TEXT,
  aadhar_image_url TEXT,
  religion VARCHAR(50),
  food_preference VARCHAR(50),
  gender VARCHAR(10),
  security_money NUMERIC DEFAULT 0,
  registration_number VARCHAR(50),
  room_number VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  library_id INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_hostel_students_branch ON hostel_students(branch_id);
CREATE INDEX IF NOT EXISTS idx_hostel_students_library ON hostel_students(library_id);

CREATE TABLE IF NOT EXISTS hostel_student_history (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES hostel_students(id) ON DELETE CASCADE,
  stay_start_date DATE NOT NULL,
  stay_end_date DATE NOT NULL,
  total_fee NUMERIC DEFAULT 0,
  cash_paid NUMERIC DEFAULT 0,
  online_paid NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  room_number VARCHAR(50),
  remark TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hostel_history_student ON hostel_student_history(student_id);

-- 21) Student accounts (login for students)
CREATE TABLE IF NOT EXISTS student_accounts (
  id SERIAL PRIMARY KEY,
  library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  name VARCHAR(255),
  email VARCHAR(255),
  registration_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive')),
  UNIQUE(library_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_student_accounts_library ON student_accounts(library_id);
CREATE INDEX IF NOT EXISTS idx_student_accounts_phone ON student_accounts(library_id, phone);

-- 22) Session store (connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
) WITH (OIDS=FALSE);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'session_pkey' AND conrelid = 'session'::regclass
  ) THEN
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_locker_student' AND conrelid = 'locker'::regclass
  ) THEN
    -- Add FK after both tables exist to avoid creation-time cycle
    ALTER TABLE locker
      ADD CONSTRAINT fk_locker_student
      FOREIGN KEY (student_id)
      REFERENCES students(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;
