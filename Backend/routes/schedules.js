const { checkPermissions } = require('./auth');

module.exports = (pool) => {
  const router = require('express').Router();

  router.get('/', checkPermissions(['manage_schedules', 'manage_library_students'], 'OR'), async (req, res) => {
    try {
      const result = await pool.query('SELECT *, fee FROM schedules WHERE library_id = $1 ORDER BY created_at DESC, title', [req.libraryId]);
      res.json({ schedules: result.rows });
    } catch (err) {
      console.error('Error fetching schedules:', err.stack);
      res.status(500).json({ message: 'Server error fetching schedules', error: err.message });
    }
  });

  router.get('/with-students', checkPermissions(['manage_schedules', 'manage_library_students'], 'OR'), async (req, res) => {
    try {
      const { branch_id } = req.query;
      let query = `
        SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.time, 
            s.event_date, 
            s.fee,
            s.branch_id,
            b.name as branch_name,
            s.created_at, 
            s.updated_at,
            COUNT(sa.student_id) as student_count
        FROM schedules s
        LEFT JOIN seat_assignments sa ON s.id = sa.shift_id 
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE s.library_id = $1
      `;
      
      const params = [req.libraryId];
      
      if (branch_id) {
        query += ` AND s.branch_id = $${params.length + 1}`;
        params.push(parseInt(branch_id, 10));
      }
      
      query += `
        GROUP BY s.id, s.title, s.description, s.time, s.event_date, s.fee, s.branch_id, b.name, s.created_at, s.updated_at
        ORDER BY s.event_date, s.time
      `;
      
      const result = await pool.query(query, params);
      res.json({ schedules: result.rows });
    } catch (err) {
      console.error('Error fetching schedules with students:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/:id', checkPermissions(['manage_schedules', 'manage_library_students'], 'OR'), async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: 'Invalid schedule ID format. Must be an integer.' });
      }
      const result = await pool.query('SELECT *, fee FROM schedules WHERE id = $1 AND library_id = $2', [scheduleId, req.libraryId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
      }
      res.json({ schedule: result.rows[0] });
    } catch (err) {
      console.error(`Error fetching schedule ${req.params.id}:`, err.stack);
      res.status(500).json({ message: 'Server error fetching schedule', error: err.message });
    }
  });

  router.post('/', checkPermissions(['manage_schedules']), async (req, res) => {
    try {
      const { title, description, time, event_date, fee, branch_id } = req.body;
      if (!title || !time || !event_date || fee === undefined || !branch_id) {
        return res.status(400).json({ message: 'Title, time, event_date, fee, and branch_id are required' });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return res.status(400).json({ message: 'Invalid event_date format, use YYYY-MM-DD' });
      }
      if (typeof fee !== 'number' || fee < 0) {
        return res.status(400).json({ message: 'Fee must be a non-negative number' });
      }
      
      // Verify the branch exists and belongs to the library
      const branchCheck = await pool.query(
        'SELECT id FROM branches WHERE id = $1 AND library_id = $2',
        [branch_id, req.libraryId]
      );
      
      if (branchCheck.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid branch ID' });
      }
      
      const result = await pool.query(
        `INSERT INTO schedules (title, description, time, event_date, fee, branch_id, created_at, updated_at, library_id)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $7) RETURNING *`,
        [title, description || null, time, event_date, fee, branch_id, req.libraryId]
      );
      res.status(201).json({
        message: 'Schedule added successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error('Error adding schedule:', err.stack);
      res.status(500).json({ message: 'Server error adding schedule', error: err.message });
    }
  });

  router.put('/:id', checkPermissions(['manage_schedules']), async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: 'Invalid schedule ID format. Must be an integer.' });
      }
      const { title, description, time, event_date, fee, branch_id } = req.body;
      
      if (branch_id) {
        // Verify the branch exists and belongs to the library
        const branchCheck = await pool.query(
          'SELECT id FROM branches WHERE id = $1 AND library_id = $2',
          [branch_id, req.libraryId]
        );
        
        if (branchCheck.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid branch ID' });
        }
      }
      if (event_date && !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
        return res.status(400).json({ message: 'Invalid event_date format, use YYYY-MM-DD' });
      }
      if (fee !== undefined && (typeof fee !== 'number' || fee < 0)) {
        return res.status(400).json({ message: 'Fee must be a non-negative number' });
      }
      const result = await pool.query(
        `UPDATE schedules SET
           title = COALESCE($1, title),
           description = COALESCE($2, description),
           time = COALESCE($3, time),
           event_date = COALESCE($4, event_date),
           fee = COALESCE($5, fee),
           branch_id = COALESCE($6, branch_id),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7 AND library_id = $8
         RETURNING *`,
        [
          title || null,
          description,
          time || null,
          event_date || null,
          fee,
          branch_id || null,
          scheduleId,
          req.libraryId
        ]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found for update' });
      }
      res.json({
        message: 'Schedule updated successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error(`Error updating schedule ${req.params.id}:`, err.stack);
      res.status(500).json({ message: 'Server error updating schedule', error: err.message });
    }
  });

  router.delete('/:id', checkPermissions(['manage_schedules']), async (req, res) => {
    try {
      const scheduleId = parseInt(req.params.id, 10);
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: 'Invalid schedule ID format. Must be an integer.' });
      }
      const result = await pool.query('DELETE FROM schedules WHERE id = $1 AND library_id = $2 RETURNING *', [scheduleId, req.libraryId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Schedule not found for deletion' });
      }
      res.json({
        message: 'Schedule deleted successfully',
        schedule: result.rows[0]
      });
    } catch (err) {
      console.error(`Error deleting schedule ${req.params.id}:`, err.stack);
      res.status(500).json({ message: 'Server error deleting schedule', error: err.message });
    }
  });

  return router;
};