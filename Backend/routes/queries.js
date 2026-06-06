const express = require('express');
const router = express.Router();
const { authenticateAny, authenticateStudent } = require('./auth');
const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');

module.exports = (pool) => {

  // POST /api/queries - Create a new query (Student only)
  router.post('/', authenticateStudent, async (req, res) => {
    const { title, description } = req.body;
    const student_id = req.session.student.id;
    const library_id = req.session.student.libraryId;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO queries (library_id, student_id, title, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [library_id, student_id, title, description]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating query:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // GET /api/queries/admin - Fetch all queries for the admin view
  router.get('/admin', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    const library_id = req.libraryId; // from ensureOwnerDataIsolation middleware

    try {
      const query = `
        SELECT 
          q.*, 
          s.name as student_name,
          COALESCE(v.upvotes, 0) as upvotes,
          COALESCE(v.downvotes, 0) as downvotes
        FROM queries q
        JOIN students s ON q.student_id = s.id
        LEFT JOIN (
          SELECT 
            query_id, 
            COUNT(*) FILTER (WHERE vote_type = 'up') as upvotes,
            COUNT(*) FILTER (WHERE vote_type = 'down') as downvotes
          FROM query_votes
          GROUP BY query_id
        ) v ON q.id = v.query_id
        WHERE q.library_id = $1
        ORDER BY q.created_at DESC
      `;
      const result = await pool.query(query, [library_id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching queries for admin:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // GET /api/queries - Fetch all queries (for students)
  router.get('/', authenticateAny, async (req, res) => {
    const library_id = req.session.owner?.id || req.session.student?.libraryId;

    try {
      const query = `
        SELECT 
          q.*, 
          s.name as student_name,
          COALESCE(v.upvotes, 0) as upvotes,
          COALESCE(v.downvotes, 0) as downvotes
        FROM queries q
        JOIN students s ON q.student_id = s.id
        LEFT JOIN (
          SELECT 
            query_id, 
            COUNT(*) FILTER (WHERE vote_type = 'up') as upvotes,
            COUNT(*) FILTER (WHERE vote_type = 'down') as downvotes
          FROM query_votes
          GROUP BY query_id
        ) v ON q.id = v.query_id
        WHERE q.library_id = $1
        ORDER BY upvotes DESC, q.created_at DESC
      `;
      const result = await pool.query(query, [library_id]);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching queries:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // POST /api/queries/:id/vote - Upvote or downvote a query (Student only)
  router.post('/:id/vote', authenticateStudent, async (req, res) => {
    const { id } = req.params;
    const { vote_type } = req.body; // 'up' or 'down'
    const student_id = req.session.student.id;
    const library_id = req.session.student.libraryId;

    if (!['up', 'down'].includes(vote_type)) {
      return res.status(400).json({ message: 'Invalid vote type.' });
    }

    try {
      // Use an UPSERT to handle voting logic in a single query
      const result = await pool.query(`
        INSERT INTO query_votes (library_id, query_id, student_id, vote_type)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (query_id, student_id)
        DO UPDATE SET vote_type = $4;
      `, [library_id, id, student_id, vote_type]);
      
      res.status(200).json({ message: 'Vote recorded.' });
    } catch (error) {
      console.error('Error voting on query:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // PUT /api/queries/:id/status - Update query status (Admin only)
  router.put('/:id/status', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const library_id = req.libraryId;

    const validStatuses = ['Approved', 'Not Approved', 'Done', 'Not Done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }

    try {
      const result = await pool.query(
        'UPDATE queries SET status = $1, updated_at = NOW() WHERE id = $2 AND library_id = $3 RETURNING *',
        [status, id, library_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Query not found or not part of your library.' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating query status:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // GET /api/queries/:id - Fetch a single query with comments
  router.get('/:id', authenticateAny, async (req, res) => {
    const { id } = req.params;
    const library_id = req.session.owner?.id || req.session.student?.libraryId;

    try {
      // Fetch query details
      const queryResult = await pool.query('SELECT q.*, s.name as student_name FROM queries q JOIN students s ON q.student_id = s.id WHERE q.id = $1 AND q.library_id = $2', [id, library_id]);
      if (queryResult.rowCount === 0) {
        return res.status(404).json({ message: 'Query not found.' });
      }
      const query = queryResult.rows[0];

      // Fetch comments
      const commentsResult = await pool.query(`
        SELECT 
          c.*, 
          CASE
            WHEN c.commenter_role = 'student' THEN s.name
            WHEN c.commenter_role = 'admin' THEN o.owner_name
          END as commenter_name
        FROM query_comments c
        LEFT JOIN students s ON c.commenter_id = s.id AND c.commenter_role = 'student'
        LEFT JOIN libraries o ON c.commenter_id = o.id AND c.commenter_role = 'admin'
        WHERE c.query_id = $1
        ORDER BY c.created_at ASC
      `, [id]);
      
      query.comments = commentsResult.rows;

      res.json(query);
    } catch (error) {
      console.error('Error fetching query details:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // POST /api/queries/:id/comments - Add a comment to a query
  router.post('/:id/comments', authenticateAny, async (req, res) => {
    const { id } = req.params;
    const { comment_text, parent_comment_id } = req.body;
    
    let commenter_id, commenter_role, library_id;

    if (req.session.student) {
      commenter_id = req.session.student.id;
      commenter_role = 'student';
      library_id = req.session.student.libraryId;
    } else if (req.session.owner) {
      commenter_id = req.session.owner.id;
      commenter_role = 'admin';
      library_id = req.session.owner.id;
    }

    if (!comment_text) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    try {
      const result = await pool.query(`
        INSERT INTO query_comments (library_id, query_id, commenter_id, commenter_role, comment_text, parent_comment_id)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [library_id, id, commenter_id, commenter_role, comment_text, parent_comment_id || null]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
};
