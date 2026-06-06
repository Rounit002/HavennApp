// routes/branches.js
module.exports = (pool) => {
  const express = require('express');
  const router = express.Router();
  const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');

  // Get all branches for the library
  router.get('/', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const isStaff = req.session?.user?.role === 'staff';
      const staffBranchAccess = Array.isArray(req.session?.user?.branchAccess)
        ? req.session.user.branchAccess.filter((id) => Number.isInteger(id))
        : [];

      let query = 'SELECT * FROM branches WHERE library_id = $1';
      const params = [req.libraryId];

      if (isStaff && staffBranchAccess.length > 0) {
        query += ' AND id = ANY($2)';
        params.push(staffBranchAccess);
      }

      query += ' ORDER BY name';

      const result = await pool.query(query, params);
      res.json({ branches: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Create new branch
  router.post('/', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { name, code } = req.body;
      if (!name) return res.status(400).json({ message: 'Branch name is required' });
      const result = await pool.query(
        'INSERT INTO branches (name, code, library_id) VALUES ($1, $2, $3) RETURNING *',
        [name, code || null, req.libraryId]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Update branch
  router.put('/:id', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, code } = req.body;
      const result = await pool.query(
        'UPDATE branches SET name = $1, code = $2 WHERE id = $3 AND library_id = $4 RETURNING *',
        [name, code || null, id, req.libraryId]
      );
      if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Delete branch
  router.delete('/:id', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM branches WHERE id = $1 AND library_id = $2 RETURNING *', [id, req.libraryId]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Branch not found' });
      res.json({ message: 'Branch deleted' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};