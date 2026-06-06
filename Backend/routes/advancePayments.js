module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdminOrStaff } = require('./auth');

  // Ensure required columns exist for new features (idempotent)
  const ensureSchema = async () => {
    try {
      await pool.query(`
        ALTER TABLE advance_payments
        ADD COLUMN IF NOT EXISTS is_done BOOLEAN DEFAULT FALSE;
      `);
      await pool.query(`
        ALTER TABLE advance_payments
        ADD COLUMN IF NOT EXISTS notes TEXT;
      `);
      await pool.query(`
        ALTER TABLE advance_payments
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      `);
    } catch (err) {
      console.error('[advance_payments] Failed ensuring schema:', err.stack);
    }
  };

  // Fire and forget; routes will still work even if this finishes slightly later
  ensureSchema();

  // Get all advance payments
  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          ap.*,
          s.name as student_name,
          s.registration_number,
          b.name as branch_name,
          COALESCE(
            (SELECT STRING_AGG(DISTINCT se.seat_number, ', ')
             FROM seat_assignments sa
             JOIN seats se ON sa.seat_id = se.id
             WHERE sa.student_id = s.id),
            'N/A'
          ) as seat_number
        FROM advance_payments ap
        LEFT JOIN students s ON ap.student_id = s.id
        LEFT JOIN branches b ON ap.branch_id = b.id
        WHERE ap.library_id = $1
        ORDER BY ap.created_at DESC`,
        [req.libraryId]
      );
      res.json({ advancePayments: result.rows });
    } catch (err) {
      console.error('Error fetching advance payments:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Add new advance payment
  router.post('/', checkAdminOrStaff, async (req, res) => {
    try {
      console.log('Received advance payment request:', req.body);
      const { student_id, amount, payment_date } = req.body;
      const studentId = student_id;
      const paymentDate = payment_date;

      console.log('Parsed values:', { studentId, amount, paymentDate });

      if (!studentId || !amount || !paymentDate) {
        console.log('Validation failed - missing fields');
        return res.status(400).json({ message: 'Student ID, amount, and payment date are required' });
      }

      // Get student details
      const studentResult = await pool.query(
        'SELECT name, branch_id, membership_end FROM students WHERE id = $1 AND library_id = $2',
        [studentId, req.libraryId]
      );

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const student = studentResult.rows[0];

      // Get branch name
      let branchName = null;
      if (student.branch_id) {
        const branchResult = await pool.query(
          'SELECT name FROM branches WHERE id = $1',
          [student.branch_id]
        );
        if (branchResult.rows.length > 0) {
          branchName = branchResult.rows[0].name;
        }
      }

      // Insert advance payment
      const result = await pool.query(
        `INSERT INTO advance_payments 
        (student_id, student_name, branch_id, branch_name, membership_expiry, amount, payment_date, library_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          studentId,
          student.name,
          student.branch_id,
          branchName,
          student.membership_end,
          amount,
          paymentDate,
          req.libraryId
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error adding advance payment:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Update advance payment (amount, payment_date, notes)
  router.put('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      // Allow camelCase or snake_case from client
      const {
        amount,
        payment_date,
        paymentDate,
        notes
      } = req.body;

      const fields = [];
      const values = [];
      let idx = 1;

      if (amount !== undefined) {
        fields.push(`amount = $${idx++}`);
        values.push(amount);
      }
      if (payment_date !== undefined || paymentDate !== undefined) {
        fields.push(`payment_date = $${idx++}`);
        values.push(payment_date ?? paymentDate);
      }
      if (notes !== undefined) {
        fields.push(`notes = $${idx++}`);
        values.push(notes);
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No updatable fields provided' });
      }

      // Always update updated_at
      fields.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE advance_payments
        SET ${fields.join(', ')}
        WHERE id = $${idx} AND library_id = $${idx + 1}
        RETURNING *
      `;
      values.push(id, req.libraryId);

      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Advance payment not found' });
      }
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Error updating advance payment:', err.stack);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Mark as done/undone
  router.patch('/:id/done', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const { is_done, isDone } = req.body;
      const done = (is_done !== undefined) ? !!is_done : !!isDone;

      const result = await pool.query(
        `UPDATE advance_payments
         SET is_done = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND library_id = $3
         RETURNING *`,
        [done, id, req.libraryId]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Advance payment not found' });
      }
      return res.json(result.rows[0]);
    } catch (err) {
      console.error('Error toggling done for advance payment:', err.stack);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Delete advance payment
  router.delete('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await pool.query(
        'DELETE FROM advance_payments WHERE id = $1 AND library_id = $2 RETURNING *',
        [id, req.libraryId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Advance payment not found' });
      }

      res.json({ message: 'Advance payment deleted successfully' });
    } catch (err) {
      console.error('Error deleting advance payment:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};
