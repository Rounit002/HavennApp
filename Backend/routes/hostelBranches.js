const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');

module.exports = (pool) => {
  const router = require('express').Router();

  // Apply owner/staff authentication and data isolation to all routes
  router.use(authenticateOwnerOrStaff);
  router.use(ensureDataIsolation);

  router.get('/', async (req, res) => {
    try {
      const libraryId = req.libraryId; // From ensureOwnerDataIsolation middleware
      const result = await pool.query(`
        SELECT b.id, b.name, COUNT(s.id) as student_count
        FROM hostel_branches b
        LEFT JOIN hostel_students s ON b.id = s.branch_id AND s.library_id = $1
        WHERE b.library_id = $1
        GROUP BY b.id
      `, [libraryId]);
      console.log('GET /hostel/branches - Fetched branches:', result.rows);
      res.json({ branches: result.rows });
    } catch (err) {
      console.error('Error in hostel branches GET route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const libraryId = req.libraryId; // From ensureOwnerDataIsolation middleware
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Branch name is required' });
      }
      const result = await pool.query(
        'INSERT INTO hostel_branches (name, library_id) VALUES ($1, $2) RETURNING *',
        [name, libraryId]
      );
      console.log('POST /hostel/branches - Created branch:', result.rows[0]);
      res.status(201).json({ branch: result.rows[0] });
    } catch (err) {
      console.error('Error in hostel branches POST route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const libraryId = req.libraryId; // From ensureOwnerDataIsolation middleware
      const { id } = req.params;
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Branch name is required' });
      }
      const result = await pool.query(
        'UPDATE hostel_branches SET name = $1 WHERE id = $2 AND library_id = $3 RETURNING *',
        [name, id, libraryId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      console.log('PUT /hostel/branches/:id - Updated branch:', result.rows[0]);
      res.json({ branch: result.rows[0] });
    } catch (err) {
      console.error('Error in hostel branches PUT route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      const libraryId = req.libraryId; // From ensureOwnerDataIsolation middleware
      const { id } = req.params;
      const studentCheck = await pool.query(
        'SELECT COUNT(*) FROM hostel_students WHERE branch_id = $1 AND library_id = $2',
        [id, libraryId]
      );
      if (parseInt(studentCheck.rows[0].count) > 0) {
        return res.status(400).json({ message: 'Cannot delete branch with existing students' });
      }
      const result = await pool.query(
        'DELETE FROM hostel_branches WHERE id = $1 AND library_id = $2 RETURNING *',
        [id, libraryId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Branch not found' });
      }
      console.log('DELETE /hostel/branches/:id - Deleted branch:', result.rows[0]);
      res.json({ message: 'Branch deleted successfully' });
    } catch (err) {
      console.error('Error in hostel branches DELETE route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};