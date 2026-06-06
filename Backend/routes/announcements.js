const express = require('express');
const router = express.Router();
const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');
const { authenticateAny } = require('./auth');

module.exports = (pool) => {
  // GET /api/announcements - Fetch announcements (with optional branch filter)
  router.get('/', authenticateAny, async (req, res) => {
    try {
      const library_id = req.session.owner?.id || req.session.student?.libraryId;
      const student_branch_id = req.session.student?.branchId;
      const isStudent = Boolean(req.session.student);
      const { branch_id: queryBranchId } = req.query;

      if (!library_id) {
        return res.status(400).json({ message: 'Library ID is required' });
      }

      let query = `
        SELECT a.*, u.username AS created_by_name, b.name AS branch_name
        FROM announcements a
        LEFT JOIN users u ON a.created_by = u.id
        LEFT JOIN branches b ON a.branch_id = b.id
        WHERE a.library_id = $1
      `;
      const params = [library_id];

      // If a student is making the request, only show active and within date range
      if (isStudent) {
        query += ` AND a.is_active = true`;
      }

      // Branch scoping for students: only their branch or global
      if (student_branch_id) {
        params.push(student_branch_id);
        query += ` AND (a.branch_id = $${params.length} OR a.is_global = true)`;
      }

      // Optional branch filter for admins/owners via query param
      if (!isStudent && queryBranchId) {
        params.push(queryBranchId);
        query += ` AND (a.branch_id = $${params.length} OR a.is_global = true)`;
      }

      // Apply date window filtering only for students
      if (isStudent) {
        query += ` AND (a.start_date IS NULL OR a.start_date <= NOW())
                   AND (a.end_date IS NULL OR a.end_date >= NOW())`;
      }

      query += ` ORDER BY a.created_at DESC`;

      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // POST /api/announcements - Create new announcement (admin/staff only)
  router.post('/', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { title, content, branch_id, is_global, start_date, end_date } = req.body;
      const library_id = req.libraryId;
      // If an owner is creating, created_by (user_id) can be null.
      // If a staff/admin is creating, use their user ID.
      const created_by = req.session.user?.id || null;

      if (!library_id) {
        return res.status(400).json({ message: 'Authentication required: Library ID is missing.' });
      }

      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }

      // Normalize inputs
      const isGlobal = Boolean(is_global);
      const branchId = isGlobal ? null : (branch_id ?? null);

      // Handle dates: keep null when not provided; normalize to start/end of day when provided as YYYY-MM-DD
      let startDate = null;
      if (start_date) {
        const s = String(start_date).trim();
        startDate = new Date(/T/.test(s) ? s : `${s}T00:00:00.000Z`);
      }
      let endDate = null;
      if (end_date) {
        const e = String(end_date).trim();
        endDate = new Date(/T/.test(e) ? e : `${e}T23:59:59.999Z`);
      }

      const query = `
        INSERT INTO announcements (library_id, title, content, branch_id, is_global, start_date, end_date, created_by, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *
      `;

      const params = [
        library_id,
        title,
        content,
        branchId,
        isGlobal,
        startDate,
        endDate,
        created_by
      ];

      const result = await pool.query(query, params);
      res.status(201).json({ 
        message: 'Announcement created successfully',
        announcement: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // PUT /api/announcements/:id - Update announcement (admin/staff only)
  router.put('/:id', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, branch_id, is_global, start_date, end_date, is_active } = req.body;
      const library_id = req.libraryId;

      if (!library_id) {
        return res.status(400).json({ message: 'Authentication required' });
      }

      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }

      // Normalize inputs
      const isGlobal = Boolean(is_global);
      const branchId = isGlobal ? null : (branch_id ?? null);

      let startDate = null;
      if (start_date) {
        const s = String(start_date).trim();
        startDate = new Date(/T/.test(s) ? s : `${s}T00:00:00.000Z`);
      }
      let endDate = null;
      if (end_date) {
        const e = String(end_date).trim();
        endDate = new Date(/T/.test(e) ? e : `${e}T23:59:59.999Z`);
      }

      const query = `
        UPDATE announcements 
        SET title = $1, content = $2, branch_id = $3, is_global = $4, 
            start_date = $5, end_date = $6, is_active = $7, updated_at = NOW()
        WHERE id = $8 AND library_id = $9
        RETURNING *
      `;

      const params = [
        title,
        content,
        branchId,
        isGlobal,
        startDate,
        endDate,
        is_active !== undefined ? is_active : true,
        id,
        library_id
      ];

      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Announcement not found' });
      }

      res.json({ 
        message: 'Announcement updated successfully',
        announcement: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating announcement:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // DELETE /api/announcements/:id - Delete announcement (admin/staff only)
  router.delete('/:id', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
      const { id } = req.params;
      const library_id = req.libraryId;

      if (!library_id) {
        return res.status(400).json({ message: 'Authentication required' });
      }

      const query = `
        DELETE FROM announcements 
        WHERE id = $1 AND library_id = $2
        RETURNING *
      `;

      const result = await pool.query(query, [id, library_id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Announcement not found' });
      }

      res.json({ message: 'Announcement deleted successfully' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};
