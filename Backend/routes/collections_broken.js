module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkPermissions } = require('./auth');

  /**
   * @route   GET /api/collections/stats
   * @desc    Get aggregate collection statistics.
   * @access  STRICTLY Admin only.
   */
  router.get('/stats', checkAdmin, async (req, res) => {
    try {
      let query = `
        SELECT 
          COALESCE(SUM(smh.amount_paid), 0) as "totalPaid",
          COALESCE(SUM(smh.due_amount), 0) as "totalDue",
          COALESCE(SUM(smh.cash), 0) as "totalCash",
          COALESCE(SUM(smh.online), 0) as "totalOnline",
          COALESCE(SUM(smh.security_money), 0) as "totalSecurityMoney"
        FROM student_membership_history smh
      `;
      const params = [req.libraryId];
      let whereClause = ' WHERE smh.library_id = $1';
      let paramIndex = 2;

      // Handle date filtering - either month or date range
      if (req.query.fromDate && req.query.toDate) {
        // Date range filtering
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
          return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        whereClause += ` AND smh.changed_at::date >= $${paramIndex} AND smh.changed_at::date <= $${paramIndex + 1}`;
        params.push(fromDate, toDate);
        paramIndex += 2;
      } else if (req.query.month) {
        // Month filtering (existing functionality)
        const monthParam = req.query.month;
        if (!/^\d{4}-\d{2}$/.test(monthParam)) {
          return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
        }
        const [year, month] = monthParam.split('-');
        whereClause += ` AND EXTRACT(YEAR FROM smh.changed_at) = $${paramIndex} AND EXTRACT(MONTH FROM smh.changed_at) = $${paramIndex + 1}`;
        params.push(year, month);
        paramIndex += 2;
      }

      if (req.query.branchId) {
        const branchId = parseInt(req.query.branchId, 10);
        if (isNaN(branchId)) {
          return res.status(400).json({ message: 'Invalid branch ID' });
        }
        whereClause += (paramIndex > 1 ? ' AND' : ' WHERE') + ` smh.branch_id = $${paramIndex}`;
        params.push(branchId);
      }
      
      query += whereClause;

      const result = await pool.query(query, params);
      
      const stats = {
          totalPaid: parseFloat(result.rows[0].totalPaid),
          totalDue: parseFloat(result.rows[0].totalDue),
          totalCash: parseFloat(result.rows[0].totalCash),
          totalOnline: parseFloat(result.rows[0].totalOnline),
          totalSecurityMoney: parseFloat(result.rows[0].totalSecurityMoney),
      };

      res.json(stats);
    } catch (err) {
      console.error('Error fetching collection stats:', err);
      res.status(500).json({ message: 'Server error fetching collection stats', error: err.message });
    }
  });

  /**
   * @route   GET /api/collections
   * @desc    Get a list of all individual student collection records.
   * @access  Admin or Staff with 'view_collections' permission.
   */
  router.get('/', checkPermissions(['view_collections']), async (req, res) => {
    try {
      let query = `
        SELECT 
          smh.id as "historyId", 
          smh.student_id as "studentId", 
          CASE 
            WHEN s.id IS NOT NULL THEN s.name 
            ELSE '[Deleted Student]'
          END as "studentName",
          CASE 
            WHEN s.id IS NOT NULL THEN s.phone 
            ELSE smh.phone
          END as "studentPhone",
          CASE 
            WHEN s.id IS NOT NULL THEN 'Active'
            ELSE 'Deleted'
          END as "studentStatus",
          sch.title as "shiftTitle", 
          smh.total_fee as "totalFee", 
          smh.amount_paid as "amountPaid", 
          smh.due_amount as "dueAmount",
          smh.cash,
          smh.online,
          smh.security_money as "securityMoney",
          smh.remark,
          smh.changed_at as "createdAt",
          smh.branch_id as "branchId",
          b.name as "branchName",
          (SELECT seats.seat_number FROM seat_assignments sa LEFT JOIN seats ON sa.seat_id = seats.id WHERE sa.student_id = smh.student_id ORDER BY sa.id DESC LIMIT 1) AS "seatNumber"
        FROM student_membership_history smh
        LEFT JOIN students s ON smh.student_id = s.id
        LEFT JOIN schedules sch ON smh.shift_id = sch.id
        LEFT JOIN branches b ON smh.branch_id = b.id
      `;
      const params = [req.libraryId];
      let whereClause = ' WHERE smh.library_id = $1';
      let paramIndex = 2;

      // Handle date filtering - either month or date range
      if (req.query.fromDate && req.query.toDate) {
        // Date range filtering
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
          return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
        }
        whereClause += ` AND smh.changed_at::date >= $${paramIndex} AND smh.changed_at::date <= $${paramIndex + 1}`;
        params.push(fromDate, toDate);
        paramIndex += 2;
      } else if (req.query.month) {
        // Month filtering (existing functionality)
        const monthParam = req.query.month;
         if (!/^\d{4}-\d{2}$/.test(monthParam)) {
          return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
        }
        const [year, month] = monthParam.split('-');
        whereClause += ` AND EXTRACT(YEAR FROM smh.changed_at) = $${paramIndex} AND EXTRACT(MONTH FROM smh.changed_at) = $${paramIndex + 1}`;
        params.push(year, month);
        paramIndex += 2;
      }

      if (req.query.branchId) {
        const branchId = parseInt(req.query.branchId, 10);
        if (isNaN(branchId)) {
          return res.status(400).json({ message: 'Invalid branch ID' });
        }
        whereClause += (paramIndex > 1 ? ' AND' : ' WHERE') + ` smh.branch_id = $${paramIndex}`;
        params.push(branchId);
      }

      query += whereClause + ` ORDER BY smh.name;`;
      
      const result = await pool.query(query, params);

      const collections = result.rows.map(row => ({
        ...row,
        totalFee: parseFloat(row.totalFee || 0),
        amountPaid: parseFloat(row.amountPaid || 0),
        dueAmount: parseFloat(row.dueAmount || 0),
        cash: parseFloat(row.cash || 0),
        online: parseFloat(row.online || 0),
        securityMoney: parseFloat(row.securityMoney || 0),
      }));

      res.json({ collections });
    } catch (err) {
      console.error('Error fetching collections list:', err);
      res.status(500).json({ message: 'Server error fetching collections list', error: err.message });
    }
  });

  /**
   * @route   PUT /api/collections/:historyId
   * @desc    Pay a due amount for a student's collection record.
   * @access  Admin or Staff with 'view_collections' permission.
   */
  router.put('/:historyId', checkPermissions(['view_collections']), async (req, res) => {
    const client = await pool.connect(); 
    try {
      await client.query('BEGIN');

      const { historyId } = req.params;
      const { payment_amount, payment_method } = req.body;

      // --- 1. Validate Input ---
      if (typeof payment_amount !== 'number' || payment_amount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid payment amount' });
      }
      if (!['cash', 'online'].includes(payment_method)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid payment method' });
      }

      // --- 2. Fetch the specific history record to get its due amount and student_id ---
      const historyRes = await client.query('SELECT * FROM student_membership_history WHERE id = $1 AND library_id = $2 FOR UPDATE', [historyId, req.libraryId]);
      if (historyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'History record not found' });
      }
      const history = historyRes.rows[0];
      const studentId = history.student_id;
      const history_due_amount = parseFloat(history.due_amount) || 0;

      // --- 3. Check for overpayment against THIS transaction's due amount ---
      if (payment_amount > history_due_amount + 0.01) { // Use a small tolerance for float math
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Payment of ${payment_amount.toFixed(2)} exceeds the due amount of ${history_due_amount.toFixed(2)} for this specific transaction.` });
      }

      // --- 4. Fetch the main student record to get the aggregate totals ---
      const studentRes = await client.query('SELECT * FROM students WHERE id = $1 AND library_id = $2 FOR UPDATE', [studentId, req.libraryId]);
      if (studentRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: `Student with ID ${studentId} not found.` });
      }
      const student = studentRes.rows[0];

      // --- 5. Update the totals for the main STUDENT record ---
      const new_student_cash = (parseFloat(student.cash) || 0) + (payment_method === 'cash' ? payment_amount : 0);
      const new_student_online = (parseFloat(student.online) || 0) + (payment_method === 'online' ? payment_amount : 0);
      const new_student_amount_paid = (parseFloat(student.amount_paid) || 0) + payment_amount;
      const new_student_due_amount = (parseFloat(student.due_amount) || 0) - payment_amount;

      const updateStudentQuery = `
        UPDATE students 
        SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
        WHERE id = $5`;
      await client.query(updateStudentQuery, [new_student_cash, new_student_online, new_student_amount_paid, new_student_due_amount, studentId]);

      // --- 6. Update the specific HISTORY record that is being paid ---
      const new_history_cash = (parseFloat(history.cash) || 0) + (payment_method === 'cash' ? payment_amount : 0);
      const new_history_online = (parseFloat(history.online) || 0) + (payment_method === 'online' ? payment_amount : 0);
      const new_history_amount_paid = (parseFloat(history.amount_paid) || 0) + payment_amount;
      const new_history_due_amount = history_due_amount - payment_amount;

      const updateHistoryQuery = `
        UPDATE student_membership_history 
        SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
        WHERE id = $5`;
      await client.query(updateHistoryQuery, [new_history_cash, new_history_online, new_history_amount_paid, new_history_due_amount, historyId]);
      
      // --- 7. Commit and respond ---
      await client.query('COMMIT');
      res.json({ message: 'Payment updated successfully' });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating payment:', err);
      res.status(500).json({ message: 'Server error during payment update', error: err.message });
    } finally {
      client.release();
    }
  });

  /**
   * @route   DELETE /api/collections/:historyId
   * @desc    Delete a specific collection/due record from student_membership_history
   * @access  Admin only
   */
  router.delete('/:historyId', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const historyId = parseInt(req.params.historyId, 10);
      if (isNaN(historyId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid history ID' });
      }

      // Fetch the history record to get payment details and student_id
      const historyRes = await client.query(
        'SELECT * FROM student_membership_history WHERE id = $1 AND library_id = $2 FOR UPDATE',
        [historyId, req.libraryId]
      );

      if (historyRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Collection record not found' });
      }

      const history = historyRes.rows[0];
      const studentId = history.student_id;
      const historyAmountPaid = parseFloat(history.amount_paid) || 0;

    // --- 1. Validate Input ---
    if (typeof payment_amount !== 'number' || payment_amount <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid payment amount' });
    }
    if (!['cash', 'online'].includes(payment_method)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    // --- 2. Fetch the specific history record to get its due amount and student_id ---
    const historyRes = await client.query('SELECT * FROM student_membership_history WHERE id = $1 AND library_id = $2 FOR UPDATE', [historyId, req.libraryId]);
    if (historyRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'History record not found' });
    }
    const history = historyRes.rows[0];
    const studentId = history.student_id;
    const history_due_amount = parseFloat(history.due_amount) || 0;

    // --- 3. Check for overpayment against THIS transaction's due amount ---
    if (payment_amount > history_due_amount + 0.01) { // Use a small tolerance for float math
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Payment of ${payment_amount.toFixed(2)} exceeds the due amount of ${history_due_amount.toFixed(2)} for this specific transaction.` });
    }

    // --- 4. Fetch the main student record to get the aggregate totals ---
    const studentRes = await client.query('SELECT * FROM students WHERE id = $1 AND library_id = $2 FOR UPDATE', [studentId, req.libraryId]);
    if (studentRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Student with ID ${studentId} not found.` });
    }
    const student = studentRes.rows[0];

    // --- 5. Update the totals for the main STUDENT record ---
    const new_student_cash = (parseFloat(student.cash) || 0) + (payment_method === 'cash' ? payment_amount : 0);
    const new_student_online = (parseFloat(student.online) || 0) + (payment_method === 'online' ? payment_amount : 0);
    const new_student_amount_paid = (parseFloat(student.amount_paid) || 0) + payment_amount;
    const new_student_due_amount = (parseFloat(student.due_amount) || 0) - payment_amount;

    const updateStudentQuery = `
      UPDATE students 
      SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
      WHERE id = $5`;
    await client.query(updateStudentQuery, [new_student_cash, new_student_online, new_student_amount_paid, new_student_due_amount, studentId]);

    // --- 6. Update the specific HISTORY record that is being paid ---
    const new_history_cash = (parseFloat(history.cash) || 0) + (payment_method === 'cash' ? payment_amount : 0);
    const new_history_online = (parseFloat(history.online) || 0) + (payment_method === 'online' ? payment_amount : 0);
    const new_history_amount_paid = (parseFloat(history.amount_paid) || 0) + payment_amount;
    const new_history_due_amount = history_due_amount - payment_amount;

    const updateHistoryQuery = `
      UPDATE student_membership_history 
      SET cash = $1, online = $2, amount_paid = $3, due_amount = $4 
      WHERE id = $5`;
    await client.query(updateHistoryQuery, [new_history_cash, new_history_online, new_history_amount_paid, new_history_due_amount, historyId]);
    
    // --- 7. Commit and respond ---
    await client.query('COMMIT');
    res.json({ message: 'Payment updated successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating payment:', err);
    res.status(500).json({ message: 'Server error during payment update', error: err.message });
  } finally {
    client.release();
  }

      /**
   * @route   DELETE /api/collections/:historyId
   * @desc    Delete a specific collection/due record from student_membership_history
   * @access  Admin only
   */
  router.delete('/:historyId', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const historyId = parseInt(req.params.historyId, 10);
      if (isNaN(historyId)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Invalid history ID' });
      }

      // Fetch the history record to get payment details and student_id
      const deleteHistoryRes = await client.query(
        'SELECT * FROM student_membership_history WHERE id = $1 AND library_id = $2 FOR UPDATE',
        [historyId, req.libraryId]
      );

      if (deleteHistoryRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Collection record not found' });
      }

      const deleteHistory = deleteHistoryRes.rows[0];
      const deleteStudentId = deleteHistory.student_id;
      const historyAmountPaid = parseFloat(deleteHistory.amount_paid) || 0;
      const historyCash = parseFloat(deleteHistory.cash) || 0;
      const historyOnline = parseFloat(deleteHistory.online) || 0;
      const historyDueAmount = parseFloat(deleteHistory.due_amount) || 0;
      const historyTotalFee = parseFloat(deleteHistory.total_fee) || 0;

      // Fetch student record to update aggregate totals
      // Skip this step if student_id is NULL (student was deleted)
      if (deleteStudentId !== null) {
        const studentRes = await client.query(
          'SELECT * FROM students WHERE id = $1 AND library_id = $2 FOR UPDATE',
          [deleteStudentId, req.libraryId]
        );

        if (studentRes.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ message: 'Student not found' });
        }

        const student = studentRes.rows[0];

        // Recalculate student totals by subtracting history record amounts
        const newStudentCash = Math.max(0, (parseFloat(student.cash) || 0) - historyCash);
        const newStudentOnline = Math.max(0, (parseFloat(student.online) || 0) - historyOnline);
        const newStudentAmountPaid = Math.max(0, (parseFloat(student.amount_paid) || 0) - historyAmountPaid);
        const newStudentDueAmount = Math.max(0, (parseFloat(student.due_amount) || 0) - historyDueAmount);
        const newStudentTotalFee = Math.max(0, (parseFloat(student.total_fee) || 0) - historyTotalFee);

        // Update student record
        await client.query(
          `UPDATE students 
             SET cash = $1, online = $2, amount_paid = $3, due_amount = $4, total_fee = $5 
             WHERE id = $6`,
          [newStudentCash, newStudentOnline, newStudentAmountPaid, newStudentDueAmount, newStudentTotalFee, deleteStudentId]
        );
      }

      // Delete the history record
      await client.query(
        'DELETE FROM student_membership_history WHERE id = $1 AND library_id = $2',
        [historyId, req.libraryId]
      );

      await client.query('COMMIT');
      res.json({ 
        message: 'Collection record deleted successfully',
        deletedHistoryId: historyId
      });

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error deleting collection record:', err);
      res.status(500).json({ message: 'Server error during deletion', error: err.message });
    } finally {
      client.release();
    }
  });

  return router;
};
