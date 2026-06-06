-- Migration for Public Query Feature

-- 1. Create queries table
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'Posted' CHECK (status IN ('Posted', 'Approved', 'Not Approved', 'Done', 'Not Done')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create query_votes table
CREATE TABLE IF NOT EXISTS query_votes (
    id SERIAL PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE NOT NULL,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    vote_type VARCHAR(4) NOT NULL CHECK (vote_type IN ('up', 'down')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query_id, student_id) -- Ensures a student can vote only once per query
);

-- 3. Create query_comments table
CREATE TABLE IF NOT EXISTS query_comments (
    id SERIAL PRIMARY KEY,
    library_id INTEGER REFERENCES libraries(id) ON DELETE CASCADE NOT NULL,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE NOT NULL,
    commenter_id INTEGER NOT NULL, -- Can be a student or an admin/owner
    commenter_role VARCHAR(10) NOT NULL CHECK (commenter_role IN ('student', 'admin')), -- To distinguish between student and admin comments
    comment_text TEXT NOT NULL,
    parent_comment_id INTEGER REFERENCES query_comments(id) ON DELETE CASCADE, -- For threaded comments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_queries_library_id ON queries(library_id);
CREATE INDEX IF NOT EXISTS idx_queries_student_id ON queries(student_id);
CREATE INDEX IF NOT EXISTS idx_query_votes_library_id ON query_votes(library_id);
CREATE INDEX IF NOT EXISTS idx_query_votes_query_id ON query_votes(query_id);
CREATE INDEX IF NOT EXISTS idx_query_votes_student_id ON query_votes(student_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_library_id ON query_comments(library_id);
CREATE INDEX IF NOT EXISTS idx_query_comments_query_id ON query_comments(query_id);

-- 5. Add trigger for updated_at on queries table
CREATE TRIGGER update_queries_updated_at
BEFORE UPDATE ON queries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
