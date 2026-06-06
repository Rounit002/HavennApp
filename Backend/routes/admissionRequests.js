// Admission Requests Management Routes for Admin Dashboard
// Handles viewing, accepting, and rejecting student registration requests
const express = require('express');
const { checkAdminOrStaff } = require('./auth');
const { authenticateOwner, ensureOwnerDataIsolation } = require('./ownerAuth');

module.exports = (pool) => {
  const router = express.Router();

  // Apply authentication middleware - support both admin/staff and owners
  router.use((req, res, next) => {
    const isAdmin = req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff');
    const isOwner = req.session.owner || (req.session.user && req.session.user.isOwner);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Access denied. Admin, staff, or owner privileges required.' });
    }
    
    // Set library ID for data isolation
    if (req.session.owner) {
      req.libraryId = req.session.owner.id;
    } else if (req.session.user && req.session.user.libraryId) {
      req.libraryId = req.session.user.libraryId;
    }
    
    next();
  });

  // Get all admission requests for the library
  router.get('/', async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = `
        SELECT 
          ar.id, ar.library_id, ar.name, ar.email, ar.phone, ar.address,
          ar.registration_number, ar.father_name, ar.aadhar_number,
          ar.membership_start, ar.membership_end, ar.total_fee, ar.amount_paid,
          ar.due_amount, ar.cash, ar.online,
          ar.security_money, ar.discount, ar.remark, ar.profile_image_url,
          ar.aadhaar_front_url, ar.aadhaar_back_url, ar.shift_ids, ar.seat_id,
          ar.locker_id, ar.status, ar.created_at, ar.updated_at, ar.processed_at,
          ar.rejection_reason,
          b.name as branch_name,
          s.seat_number,
          l.locker_number,
          u.username as processed_by_username
        FROM admission_requests ar
        LEFT JOIN branches b ON ar.branch_id = b.id
        LEFT JOIN seats s ON ar.seat_id = s.id
        LEFT JOIN locker l ON ar.locker_id = l.id
        LEFT JOIN users u ON ar.processed_by = u.id
        WHERE ar.library_id = $1
      `;
      
      const params = [req.libraryId];
      let paramIndex = 2;

      if (status && status !== 'all') {
        query += ` AND ar.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY ar.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit), offset);

      const result = await pool.query(query, params);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) FROM admission_requests WHERE library_id = $1';
      const countParams = [req.libraryId];
      
      if (status && status !== 'all') {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      const countResult = await pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].count);

      // Parse shift_ids JSON for each request
      const requests = result.rows.map(request => ({
        ...request,
        shift_ids: request.shift_ids ? JSON.parse(request.shift_ids) : [],
        total_fee: parseFloat(request.total_fee || 0),
        amount_paid: parseFloat(request.amount_paid || 0),
        due_amount: parseFloat(request.due_amount || 0),
        cash: parseFloat(request.cash || 0),
        online: parseFloat(request.online || 0),
        security_money: parseFloat(request.security_money || 0),
        discount: parseFloat(request.discount || 0)
      }));

      res.json({
        requests,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          limit: parseInt(limit)
        }
      });

    } catch (error) {
      console.error('[ADMISSION_REQUESTS] Error fetching requests:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get single admission request details
  router.get('/:id', async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);

      const result = await pool.query(`
        SELECT 
          ar.*,
          b.name as branch_name,
          s.seat_number,
          l.locker_number,
          u.username as processed_by_username
        FROM admission_requests ar
        LEFT JOIN branches b ON ar.branch_id = b.id
        LEFT JOIN seats s ON ar.seat_id = s.id
        LEFT JOIN locker l ON ar.locker_id = l.id
        LEFT JOIN users u ON ar.processed_by = u.id
        WHERE ar.id = $1 AND ar.library_id = $2
      `, [requestId, req.libraryId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Admission request not found' });
      }

      const request = result.rows[0];
      
      // Parse shift_ids and get shift details
      let shifts = [];
      if (request.shift_ids) {
        const shiftIds = JSON.parse(request.shift_ids);
        if (shiftIds.length > 0) {
          const shiftsResult = await pool.query(
            'SELECT id, title, description, time FROM schedules WHERE id = ANY($1) AND library_id = $2',
            [shiftIds, req.libraryId]
          );
          shifts = shiftsResult.rows;
        }
      }

      res.json({
        ...request,
        shift_ids: request.shift_ids ? JSON.parse(request.shift_ids) : [],
        shifts,
        total_fee: parseFloat(request.total_fee || 0),
        amount_paid: parseFloat(request.amount_paid || 0),
        due_amount: parseFloat(request.due_amount || 0),
        cash: parseFloat(request.cash || 0),
        online: parseFloat(request.online || 0),
        security_money: parseFloat(request.security_money || 0),
        discount: parseFloat(request.discount || 0)
      });

    } catch (error) {
      console.error('[ADMISSION_REQUESTS] Error fetching request details:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Accept admission request - creates student and related records
  router.post('/:id/accept', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const requestId = parseInt(req.params.id);
      const userId = req.session.user ? req.session.user.id : null;

      // Get the admission request
      const requestResult = await client.query(
        'SELECT * FROM admission_requests WHERE id = $1 AND library_id = $2 AND status = $3',
        [requestId, req.libraryId, 'pending']
      );

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Pending admission request not found' });
      }

      const request = requestResult.rows[0];

      // Check if phone number already exists in students table
      const existingStudent = await client.query(
        'SELECT id FROM students WHERE phone = $1 AND library_id = $2',
        [request.phone, req.libraryId]
      );

      if (existingStudent.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'A student with this phone number already exists in the system' 
        });
      }

      // Calculate status based on membership end date
      const status = request.membership_end && new Date(request.membership_end) < new Date() ? 'expired' : 'active';

      // Insert into students table
      const studentResult = await client.query(
        `INSERT INTO students (
          library_id, name, email, phone, address, branch_id, membership_start, membership_end,
          total_fee, amount_paid, due_amount, cash, online, security_money, discount,
          remark, profile_image_url, registration_number, father_name, aadhar_number,
          locker_id, aadhaar_front_url, aadhaar_back_url, status, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        RETURNING *`,
        [
          req.libraryId, request.name, request.email, request.phone, request.address,
          request.branch_id, request.membership_start, request.membership_end,
          request.total_fee, request.amount_paid, request.due_amount,
          request.cash, request.online, request.security_money, request.discount,
          request.remark, request.profile_image_url, request.registration_number,
          request.father_name, request.aadhar_number, request.locker_id,
          request.aadhaar_front_url, request.aadhaar_back_url, status, true
        ]
      );

      const student = studentResult.rows[0];

      // Handle seat assignments if shift_ids exist
      let firstShiftId = null;
      if (request.shift_ids && request.seat_id) {
        const shiftIds = JSON.parse(request.shift_ids);
        for (const shiftId of shiftIds) {
          await client.query(
            'INSERT INTO seat_assignments (seat_id, shift_id, student_id, library_id) VALUES ($1, $2, $3, $4)',
            [request.seat_id, shiftId, student.id, req.libraryId]
          );
          if (!firstShiftId) firstShiftId = shiftId;
        }
      }

      // Update locker assignment if locker_id exists
      if (request.locker_id) {
        await client.query(
          'UPDATE locker SET is_assigned = true, student_id = $1 WHERE id = $2 AND library_id = $3',
          [student.id, request.locker_id, req.libraryId]
        );
      }

      // Insert into student_membership_history
      await client.query(
        `INSERT INTO student_membership_history (
          student_id, library_id, name, email, phone, address, membership_start, membership_end,
          total_fee, amount_paid, due_amount, cash, online, security_money, discount,
          remark, seat_id, shift_id, branch_id, registration_number, father_name, aadhar_number,
          profile_image_url, aadhaar_front_url, aadhaar_back_url, locker_id, status, changed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, NOW())`,
        [
          student.id, req.libraryId, student.name, student.email, student.phone, student.address,
          student.membership_start, student.membership_end, student.total_fee, student.amount_paid,
          student.due_amount, student.cash, student.online, student.security_money, student.discount,
          student.remark, request.seat_id, firstShiftId, student.branch_id, student.registration_number,
          student.father_name, student.aadhar_number, student.profile_image_url, student.aadhaar_front_url,
          student.aadhaar_back_url, student.locker_id, student.status
        ]
      );

      // Create student account for login if phone is provided
      if (request.phone) {
        const existingAccount = await client.query(
          'SELECT id FROM student_accounts WHERE phone = $1 AND library_id = $2',
          [request.phone, req.libraryId]
        );

        if (existingAccount.rows.length === 0) {
          await client.query(
            `INSERT INTO student_accounts (library_id, phone, password, student_id, name, email, registration_number, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              req.libraryId, request.phone, request.phone, // Password same as phone
              student.id, student.name, student.email, student.registration_number
            ]
          );
        }
      }

      // Update admission request status
      await client.query(
        'UPDATE admission_requests SET status = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3',
        ['accepted', userId, requestId]
      );

      await client.query('COMMIT');

      res.json({
        message: 'Admission request accepted successfully',
        student: {
          ...student,
          total_fee: parseFloat(student.total_fee || 0),
          amount_paid: parseFloat(student.amount_paid || 0),
          due_amount: parseFloat(student.due_amount || 0),
          cash: parseFloat(student.cash || 0),
          online: parseFloat(student.online || 0),
          security_money: parseFloat(student.security_money || 0),
          discount: parseFloat(student.discount || 0)
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[ADMISSION_REQUESTS] Error accepting request:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      client.release();
    }
  });

  // Reject admission request
  router.post('/:id/reject', async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { reason } = req.body;
      const userId = req.session.user ? req.session.user.id : null;

      const result = await pool.query(
        `UPDATE admission_requests 
         SET status = $1, processed_at = NOW(), processed_by = $2, rejection_reason = $3, updated_at = NOW()
         WHERE id = $4 AND library_id = $5 AND status = $6
         RETURNING *`,
        ['rejected', userId, reason || null, requestId, req.libraryId, 'pending']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Pending admission request not found' });
      }

      res.json({
        message: 'Admission request rejected successfully',
        request: result.rows[0]
      });

    } catch (error) {
      console.error('[ADMISSION_REQUESTS] Error rejecting request:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get admission requests statistics
  router.get('/stats/summary', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count
        FROM admission_requests 
        WHERE library_id = $1
        GROUP BY status
      `, [req.libraryId]);

      const stats = {
        pending: 0,
        accepted: 0,
        rejected: 0,
        total: 0
      };

      result.rows.forEach(row => {
        stats[row.status] = parseInt(row.count);
        stats.total += parseInt(row.count);
      });

      res.json(stats);

    } catch (error) {
      console.error('[ADMISSION_REQUESTS] Error fetching stats:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};
