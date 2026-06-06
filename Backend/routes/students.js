module.exports = (pool) => {
  const router = require('express').Router();
  const { checkAdmin, checkAdminOrStaff } = require('./auth');
  const { checkPermissions } = require('./auth');
  const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');

  const withCalculatedStatus = (selectFields = 's.*') => `
    SELECT
      ${selectFields},
      CASE
        WHEN s.membership_end < CURRENT_DATE THEN 'expired'
        ELSE 'active'
      END AS status
    FROM students s
  `;

  router.get('/', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId, fromDate, toDate } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;

      let query = `
        SELECT
          s.id,
          s.name,
          s.registration_number AS "registrationNumber",
          s.father_name AS "fatherName",
          s.aadhar_number AS "aadharNumber",
          s.email,
          s.phone,
          s.address,
          s.branch_id AS "branchId",
          b.name AS "branchName",
          s.gender,
          TO_CHAR(s.membership_start, 'YYYY-MM-DD') AS "membershipStart",
          TO_CHAR(s.membership_end, 'YYYY-MM-DD') AS "membershipEnd",
          s.total_fee AS "totalFee",
          s.amount_paid AS "amountPaid",
          s.due_amount AS "dueAmount",
          s.cash,
          s.online,
          s.security_money AS "securityMoney",
          s.remark,
          s.is_active AS "isActive",
          s.profile_image_url AS "profileImageUrl",
          s.aadhaar_front_url AS "aadhaarFrontUrl",
          s.aadhaar_back_url AS "aadhaarBackUrl",
          s.discount,
          TO_CHAR(s.created_at, 'YYYY-MM-DD') AS "createdAt",
          TO_CHAR(s.updated_at, 'YYYY-MM-DD') AS "updatedAt",
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status,
          (SELECT seats.seat_number
             FROM seat_assignments sa
             LEFT JOIN seats ON sa.seat_id = seats.id
             WHERE sa.student_id = s.id
             ORDER BY sa.id DESC
             LIMIT 1) AS "seatNumber",
          l.locker_number AS "lockerNumber"
        FROM students s
        LEFT JOIN locker l ON s.locker_id = l.id
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE s.library_id = $1
      `;
      const params = [req.libraryId];
      let paramIndex = 2;

      if (branchIdNum) {
        query += ` AND s.branch_id = $${paramIndex}`;
        params.push(branchIdNum);
        paramIndex++;
      }

      if (fromDate) {
        query += ` AND s.created_at::date >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        query += ` AND s.created_at::date <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      query += ` ORDER BY s.name`;

      const result = await pool.query(query, params);
      res.json({ students: result.rows });
    } catch (err) {
      console.error('Error fetching students:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/inactive', checkAdminOrStaff, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT s.id, s.name, s.phone, s.registration_number, s.is_active, b.name as branch_name 
        FROM students s
        LEFT JOIN branches b ON s.branch_id = b.id
        WHERE s.is_active = false AND s.library_id = $1
        ORDER BY s.name
      `, [req.libraryId]);
      res.json({ students: result.rows });
    } catch (err) {
      console.error('Error fetching inactive students:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/:id/status', checkAdminOrStaff, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { id } = req.params;
      const { is_active } = req.body;

      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ message: 'is_active must be a boolean value.' });
      }

      const updatedStudent = await client.query(
        'UPDATE students SET is_active = $1 WHERE id = $2 RETURNING *',
        [is_active, id]
      );

      if (updatedStudent.rowCount === 0) {
        return res.status(404).json({ message: 'Student not found.' });
      }

      if (is_active === false) {
        await client.query(
        'DELETE FROM seat_assignments WHERE student_id = $1 AND (library_id = $2 OR library_id IS NULL)',
        [id, req.libraryId]
      );
        await client.query('UPDATE students SET locker_id = NULL WHERE id = $1 AND library_id = $2', [id, req.libraryId]);
        await client.query('UPDATE locker SET is_assigned = false, student_id = NULL WHERE student_id = $1 AND library_id = $2', [id, req.libraryId]);
      }
      
      await client.query('COMMIT');
      res.json({ student: updatedStudent.rows[0], message: `Student status updated to ${is_active ? 'active' : 'inactive'}.` });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating student status:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  router.get('/active', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;
      
      let query = `
        SELECT
          s.id, s.name, s.phone, s.registration_number, s.father_name, s.aadhar_number,
          s.email, s.address, s.branch_id, s.gender, s.membership_start, s.membership_end,
          s.total_fee, s.amount_paid, s.due_amount, s.cash, s.online, s.security_money,
          s.remark, s.is_active, s.profile_image_url, s.aadhaar_front_url, s.aadhaar_back_url,
          s.discount, s.locker_id, s.created_at,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status,
          (SELECT seats.seat_number FROM seat_assignments sa LEFT JOIN seats ON sa.seat_id = seats.id WHERE sa.student_id = s.id ORDER BY sa.id DESC LIMIT 1) AS seat_number,
          l.locker_number
        FROM students s
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.membership_end >= CURRENT_DATE AND s.library_id = $1`;
      
      const params = [req.libraryId];

      if (branchIdNum) {
        query += ` AND s.branch_id = $2`;
        params.push(branchIdNum);
      }
      query += ` ORDER BY s.name`;

      const result = await pool.query(query, params);
      const students = result.rows.map(student => ({
        ...student,
        membership_start: new Date(student.membership_start).toISOString().split('T')[0],
        membership_end: new Date(student.membership_end).toISOString().split('T')[0],
        total_fee: parseFloat(student.total_fee || 0),
        amount_paid: parseFloat(student.amount_paid || 0),
        due_amount: parseFloat(student.due_amount || 0),
        cash: parseFloat(student.cash || 0),
        online: parseFloat(student.online || 0),
        security_money: parseFloat(student.security_money || 0),
        discount: parseFloat(student.discount || 0),
        remark: student.remark || '',
        profile_image_url: student.profile_image_url || '',
        aadhaar_front_url: student.aadhaar_front_url || '',
        aadhaar_back_url: student.aadhaar_back_url || '',
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/active route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/expired', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;
      let query = `
        SELECT
            s.*,
            b.name as branch_name,
            (SELECT sa_latest.shift_id FROM seat_assignments sa_latest WHERE sa_latest.student_id = s.id ORDER BY sa_latest.id DESC LIMIT 1) as shift_id,
            (SELECT sch.title FROM seat_assignments sa_latest JOIN schedules sch ON sa_latest.shift_id = sch.id WHERE sa_latest.student_id = s.id ORDER BY sa_latest.id DESC LIMIT 1) as shift_title,
            (SELECT sa_latest.seat_id FROM seat_assignments sa_latest WHERE sa_latest.student_id = s.id ORDER BY sa_latest.id DESC LIMIT 1) as seat_id,
            (SELECT st.seat_number FROM seat_assignments sa_latest JOIN seats st ON sa_latest.seat_id = st.id WHERE sa_latest.student_id = s.id ORDER BY sa_latest.id DESC LIMIT 1) as seat_number,
            l.locker_number,
            CASE
                WHEN s.membership_end < CURRENT_DATE THEN 'expired'
                ELSE 'active'
            END AS status
        FROM students s
        LEFT JOIN branches b ON s.branch_id = b.id
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.membership_end < CURRENT_DATE AND s.library_id = $1
      `;
      const params = [req.libraryId];
      
      if (branchIdNum) {
        query += ` AND s.branch_id = $2`;
        params.push(branchIdNum);
      }
      query += ` ORDER BY s.name`;

      const result = await pool.query(query, params);
      const students = result.rows.map(student => ({
        ...student,
        membership_start: new Date(student.membership_start).toISOString().split('T')[0],
        membership_end: new Date(student.membership_end).toISOString().split('T')[0],
        total_fee: parseFloat(student.total_fee || 0),
        amount_paid: parseFloat(student.amount_paid || 0),
        due_amount: parseFloat(student.due_amount || 0),
        cash: parseFloat(student.cash || 0),
        online: parseFloat(student.online || 0),
        security_money: parseFloat(student.security_money || 0),
        discount: parseFloat(student.discount || 0),
        remark: student.remark || '',
        profile_image_url: student.profile_image_url || '',
        aadhaar_front_url: student.aadhaar_front_url || '',
        aadhaar_back_url: student.aadhaar_back_url || '',
      }));
      res.json({ students });
    } catch (err) {
      console.error('Error in students/expired route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/expiring-soon', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId, days } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;
      const daysNum = days ? parseInt(days, 10) : 5; // Default to 5 days if not specified
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + daysNum);
      
      let query = `
        SELECT
          s.id,
          s.name,
          s.phone,
          TO_CHAR(s.membership_end, 'YYYY-MM-DD') AS membership_end,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status,
          (SELECT seats.seat_number
           FROM seat_assignments sa
           LEFT JOIN seats ON sa.seat_id = seats.id
           WHERE sa.student_id = s.id
           ORDER BY sa.id DESC
           LIMIT 1) AS seat_number,
          l.locker_number
        FROM students s
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.membership_end >= CURRENT_DATE AND s.membership_end <= $1 AND s.library_id = $2
      `;
      const params = [targetDate, req.libraryId];
      
      if (branchIdNum) {
        query += ` AND s.branch_id = $3`;
        params.push(branchIdNum);
      }
      query += ` ORDER BY s.membership_end`;

      const result = await pool.query(query, params);
      res.json({ students: result.rows });
    } catch (err) {
      console.error('Error in students/expiring-soon route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // New endpoint for expiring memberships with specific date ranges
  router.get('/expiring-by-range', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId, fromDays, toDays } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;
      const fromDaysNum = fromDays ? parseInt(fromDays, 10) : 0;
      const toDaysNum = toDays ? parseInt(toDays, 10) : 7;
      
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() + fromDaysNum);
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + toDaysNum);
      
      let query = `
        SELECT
          s.id,
          s.name,
          s.phone,
          TO_CHAR(s.membership_end, 'YYYY-MM-DD') AS membership_end,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status,
          (SELECT seats.seat_number
           FROM seat_assignments sa
           LEFT JOIN seats ON sa.seat_id = seats.id
           WHERE sa.student_id = s.id
           ORDER BY sa.id DESC
           LIMIT 1) AS seat_number,
          l.locker_number
        FROM students s
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.membership_end >= $1 AND s.membership_end <= $2 AND s.library_id = $3
      `;
      const params = [fromDate, toDate, req.libraryId];
      
      if (branchIdNum) {
        query += ` AND s.branch_id = $4`;
        params.push(branchIdNum);
      }
      query += ` ORDER BY s.membership_end`;

      const result = await pool.query(query, params);
      res.json({ students: result.rows });
    } catch (err) {
      console.error('Error in students/expiring-by-range route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // New endpoint for expiring membership counts by different ranges
  router.get('/expiring-counts', checkAdminOrStaff, async (req, res) => {
    try {
      const { branchId } = req.query;
      const branchIdNum = branchId ? parseInt(branchId, 10) : null;
      
      // Define date ranges
      const today = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(today.getDate() + 2);
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(today.getDate() + 5);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      
      let baseQuery = `
        SELECT COUNT(*) as count
        FROM students s
        WHERE s.library_id = $1
      `;
      
      let params = [req.libraryId];
      let branchCondition = '';
      
      if (branchIdNum) {
        branchCondition = ` AND s.branch_id = $2`;
        params.push(branchIdNum);
      }
      
      // Query for 1-2 days
      const query1to2 = baseQuery + ` AND s.membership_end >= CURRENT_DATE AND s.membership_end <= $${params.length + 1}` + branchCondition;
      const params1to2 = [...params, twoDaysFromNow];
      
      // Query for 3-5 days
      const query3to5 = baseQuery + ` AND s.membership_end > $${params.length + 1} AND s.membership_end <= $${params.length + 2}` + branchCondition;
      const params3to5 = [...params, twoDaysFromNow, fiveDaysFromNow];
      
      // Query for 5-7 days
      const query5to7 = baseQuery + ` AND s.membership_end > $${params.length + 1} AND s.membership_end <= $${params.length + 2}` + branchCondition;
      const params5to7 = [...params, fiveDaysFromNow, sevenDaysFromNow];
      
      const [result1to2, result3to5, result5to7] = await Promise.all([
        pool.query(query1to2, params1to2),
        pool.query(query3to5, params3to5),
        pool.query(query5to7, params5to7)
      ]);
      
      res.json({
        expiring1to2Days: parseInt(result1to2.rows[0].count),
        expiring3to5Days: parseInt(result3to5.rows[0].count),
        expiring5to7Days: parseInt(result5to7.rows[0].count)
      });
    } catch (err) {
      console.error('Error in students/expiring-counts route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/:id', checkAdminOrStaff, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const queryText = `
        SELECT
          s.*,
          b.name AS branch_name,
          l.locker_number,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status
        FROM students s
        LEFT JOIN branches b ON s.branch_id = b.id
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.id = $1 AND s.library_id = $2
      `;
      const result = await pool.query(queryText, [id, req.libraryId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Student not found' });
      }
      const studentData = result.rows[0];
      const assignments = await pool.query(`
        SELECT sa.seat_id, sa.shift_id, seats.seat_number, sch.title AS shift_title
        FROM seat_assignments sa
        LEFT JOIN seats ON sa.seat_id = seats.id
        LEFT JOIN schedules sch ON sa.shift_id = sch.id
        WHERE sa.student_id = $1 AND (sa.library_id = $2 OR sa.library_id IS NULL)
      `, [id, req.libraryId]);
      res.json({
        ...studentData,
        membership_start: new Date(studentData.membership_start).toISOString().split('T')[0],
        membership_end: new Date(studentData.membership_end).toISOString().split('T')[0],
        total_fee: parseFloat(studentData.total_fee || 0),
        amount_paid: parseFloat(studentData.amount_paid || 0),
        due_amount: parseFloat(studentData.due_amount || 0),
        cash: parseFloat(studentData.cash || 0),
        online: parseFloat(studentData.online || 0),
        security_money: parseFloat(studentData.security_money || 0),
        discount: parseFloat(studentData.discount || 0),
        remark: studentData.remark || '',
        profile_image_url: studentData.profile_image_url || '',
        aadhaar_front_url: studentData.aadhaar_front_url || '',
        aadhaar_back_url: studentData.aadhaar_back_url || '',
        assignments: assignments.rows,
        locker_number: studentData.locker_number || null,
      });
    } catch (err) {
      console.error('Error in students/:id route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.get('/shift/:shiftId', checkAdminOrStaff, async (req, res) => {
    try {
      const { shiftId } = req.params;
      const { search, status: statusFilter } = req.query;
      
      const shiftIdNum = parseInt(shiftId, 10);
      if (isNaN(shiftIdNum)) {
        return res.status(400).json({ message: 'Invalid Shift ID' });
      }

      let query = `
        SELECT
          s.id,
          s.name,
          s.email,
          s.phone,
          s.registration_number,
          s.father_name,
          s.aadhar_number,
          s.profile_image_url,
          s.aadhaar_front_url,
          s.aadhaar_back_url,
          s.membership_end,
          s.discount,
          s.branch_id,
          l.locker_number,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status
        FROM students s
        JOIN seat_assignments sa ON s.id = sa.student_id
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE sa.shift_id = $1 AND s.library_id = $2
      `;
      const params = [shiftIdNum, req.libraryId];
      
      let paramIndex = 3;
      if (search) {
        query += ` AND (s.name ILIKE $${paramIndex} OR s.phone ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      
      if (statusFilter && statusFilter !== 'all') {
        if (statusFilter === 'active') {
          query += ` AND s.membership_end >= CURRENT_DATE`;
        } else if (statusFilter === 'expired') {
          query += ` AND s.membership_end < CURRENT_DATE`;
        }
      }
      
      query += ` ORDER BY s.name`;

      const result = await pool.query(query, params);
      res.json({ students: result.rows });
    } catch (err) {
      console.error(`Error fetching students for shift ${req.params.shiftId}:`, err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', async (req, res) => {
    // Enhanced permission check that supports both admin/staff and owners
    const isAdmin = req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff');
    const isOwner = req.session.owner || (req.session.user && req.session.user.isOwner);
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Access denied. Admin, staff, or owner privileges required.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const {
        name, email, phone, address, branch_id, membership_start, membership_end,
        total_fee, amount_paid, shift_ids, seat_id, cash, online, security_money, remark, profile_image_url,
        registration_number, father_name, aadhar_number, locker_id, aadhaar_front_url, aadhaar_back_url, discount, created_at, gender
      } = req.body;

      console.log('Received request body for POST /students:', req.body);

      if (!name || !branch_id || !membership_start || !membership_end) {
        console.error('Validation failed: Missing required fields');
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Required fields missing (name, branch_id, membership_start, membership_end)' });
      }

      const branchIdNum = parseInt(branch_id, 10);
      const seatIdNum = seat_id ? parseInt(seat_id, 10) : null;
      const lockerIdNum = locker_id ? parseInt(locker_id, 10) : null;
      const shiftIdsNum = shift_ids && Array.isArray(shift_ids) ? shift_ids.map(id => parseInt(id, 10)) : [];

      const feeValue = parseFloat(total_fee || 0);
      const paidValue = parseFloat(amount_paid || 0);
      const discountValue = parseFloat(discount || 0);
      if (isNaN(feeValue) || feeValue < 0) {
        console.error('Validation failed: Total fee invalid', { total_fee });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Total fee must be a valid non-negative number' });
      }
      if (isNaN(paidValue) || paidValue < 0) {
        console.error('Validation failed: Amount paid invalid', { amount_paid });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Amount paid must be a valid non-negative number' });
      }
      if (isNaN(discountValue) || discountValue < 0) {
        console.error('Validation failed: Discount invalid', { discount });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Discount must be a valid non-negative number' });
      }

      const cashValue = cash !== undefined ? parseFloat(cash) : 0;
      const onlineValue = online !== undefined ? parseFloat(online) : 0;
      const securityMoneyValue = security_money !== undefined ? parseFloat(security_money) : 0;

      if (isNaN(cashValue) || cashValue < 0) {
        console.error('Validation failed: Cash invalid', { cash });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Cash must be a valid non-negative number' });
      }
      if (isNaN(onlineValue) || onlineValue < 0) {
        console.error('Validation failed: Online invalid', { online });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Online payment must be a valid non-negative number' });
      }
      if (isNaN(securityMoneyValue) || securityMoneyValue < 0) {
        console.error('Validation failed: Security money invalid', { security_money });
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Security money must be a valid non-negative number' });
      }

      const dueAmount = feeValue - discountValue - paidValue;

      if (seatIdNum && shiftIdsNum.length > 0) {
        const seatCheck = await client.query('SELECT 1 FROM seats WHERE id = $1', [seatIdNum]);
        if (seatCheck.rows.length === 0) {
          console.error('Validation failed: Seat does not exist', { seatIdNum });
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `Seat with ID ${seatIdNum} does not exist` });
        }

        for (const shiftId of shiftIdsNum) {
          const shiftCheck = await client.query('SELECT 1 FROM schedules WHERE id = $1', [shiftId]);
          if (shiftCheck.rows.length === 0) {
            console.error('Validation failed: Shift does not exist', { shiftId });
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Shift with ID ${shiftId} does not exist` });
          }
        }

        for (const shiftId of shiftIdsNum) {
          const checkAssignment = await client.query(
            'SELECT 1 FROM seat_assignments WHERE seat_id = $1 AND shift_id = $2',
            [seatIdNum, shiftId]
          );
          if (checkAssignment.rows.length > 0) {
            console.error('Validation failed: Seat already assigned for shift', { seatIdNum, shiftId });
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Seat is already assigned for shift ${shiftId}` });
          }
        }
      }

      if (lockerIdNum) {
        const lockerCheck = await client.query('SELECT is_assigned FROM locker WHERE id = $1', [lockerIdNum]);
        if (lockerCheck.rows.length === 0) {
          console.error('Validation failed: locker does not exist', { lockerIdNum });
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} does not exist` });
        }
        if (lockerCheck.rows[0].is_assigned) {
          console.error('Validation failed: locker already assigned', { lockerIdNum });
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} is already assigned` });
        }
      }

      const status = new Date(membership_end) < new Date() ? 'expired' : 'active';

      // Use the provided createdAt date or default to current date
      const createdAt = created_at ? new Date(created_at).toISOString() : new Date().toISOString();
      
      const result = await client.query(
        `INSERT INTO students (
          name, email, phone, address, branch_id, gender, membership_start, membership_end,
          total_fee, amount_paid, due_amount, cash, online, security_money, remark, 
          profile_image_url, aadhaar_front_url, aadhaar_back_url, status, locker_id,
          registration_number, father_name, aadhar_number, discount, is_active, created_at, library_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING *`,
        [
          name, email, phone, address, branchIdNum, gender || 'male', membership_start, membership_end,
          feeValue, paidValue, dueAmount, cashValue, onlineValue, securityMoneyValue, remark || null, 
          profile_image_url || null, aadhaar_front_url || null, aadhaar_back_url || null, status, lockerIdNum,
          registration_number || null, father_name || null, aadhar_number || null, discountValue, true, createdAt, req.libraryId
        ]
      );
      const student = result.rows[0];

      if (lockerIdNum) {
        await client.query(
          'UPDATE locker SET is_assigned = true, student_id = $1 WHERE id = $2',
          [student.id, lockerIdNum]
        );
      }

      let firstShiftId = null;
      if (shiftIdsNum.length > 0) {
        for (const shiftId of shiftIdsNum) {
          await client.query(
            'INSERT INTO seat_assignments (seat_id, shift_id, student_id, library_id) VALUES ($1, $2, $3, $4)',
            [seatIdNum, shiftId, student.id, req.libraryId]
          );
          if (!firstShiftId) firstShiftId = shiftId;
        }
      }

      // Use the same created_at date for the membership history
      await client.query(
        `INSERT INTO student_membership_history (
          student_id, name, email, phone, address, gender,
          membership_start, membership_end, status,
          total_fee, amount_paid, due_amount,
          cash, online, security_money, remark,
          seat_id, shift_id, branch_id,
          registration_number, father_name, aadhar_number,
          profile_image_url, aadhaar_front_url, aadhaar_back_url,
          locker_id, discount, changed_at, library_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
        [
          student.id, student.name, student.email, student.phone, student.address, gender || 'male',
          student.membership_start, student.membership_end, student.status,
          student.total_fee, student.amount_paid, student.due_amount,
          student.cash, student.online, student.security_money, student.remark || '',
          seatIdNum, firstShiftId, branchIdNum,
          student.registration_number, student.father_name, student.aadhar_number,
          student.profile_image_url || '', student.aadhaar_front_url || '', student.aadhaar_back_url || '',
          lockerIdNum, student.discount, createdAt, req.libraryId
        ]
      );

      // 🚀 AUTOMATIC STUDENT LOGIN ACCOUNT CREATION
      // This ensures new students can login immediately with their phone number
      console.log(`[STUDENTS] 🔄 Starting automatic student account creation process...`);
      
      try {
        let libraryId = null;
        let libraryCode = null;
        
        // Enhanced session detection for owners
        if (req.session.owner) {
          libraryId = req.session.owner.id;
          libraryCode = req.session.owner.library_code;
          console.log(`[STUDENTS] ✅ Owner session detected - library_id: ${libraryId}, library_code: ${libraryCode}`);
        } else if (req.session.user && req.session.user.isOwner && req.session.user.libraryId) {
          libraryId = req.session.user.libraryId;
          libraryCode = req.session.user.libraryCode;
          console.log(`[STUDENTS] ✅ Owner user session detected - library_id: ${libraryId}, library_code: ${libraryCode}`);
        } else {
          // For admin/staff, we won't create student accounts automatically
          console.log(`[STUDENTS] ℹ️  Admin/Staff session - no automatic student account creation`);
          console.log(`[STUDENTS] 🔍 Session debug - req.session.user:`, JSON.stringify(req.session.user, null, 2));
          console.log(`[STUDENTS] 🔍 Session debug - req.session.owner:`, JSON.stringify(req.session.owner, null, 2));
        }
        
        // Only create student accounts if this is an owner session and we have required data
        if (libraryId && phone && name) {
          console.log(`[STUDENTS] 🎯 CREATING LOGIN ACCOUNT - Student: ${name}, Phone: ${phone}, Library ID: ${libraryId}`);
          
          // Check if student account already exists
          const existingAccount = await client.query(
            'SELECT id FROM student_accounts WHERE phone = $1 AND library_id = $2',
            [phone, libraryId]
          );
          
          if (existingAccount.rows.length === 0) {
            // Get library code from database if not in session
            if (!libraryCode) {
              const libraryResult = await client.query(
                'SELECT library_code FROM libraries WHERE id = $1',
                [libraryId]
              );
              libraryCode = libraryResult.rows[0]?.library_code || 'UNKNOWN';
            }
            
            // Create the student login account
            const accountResult = await client.query(`
              INSERT INTO student_accounts (library_id, phone, password, student_id, name, email, registration_number, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
              RETURNING id
            `, [
              libraryId,
              phone,
              phone, // Password is same as phone number for easy login
              student.id,
              name,
              email || null,
              registration_number || null
            ]);
            
            const accountId = accountResult.rows[0].id;
            
            console.log(`[STUDENTS] ✅ SUCCESS! Auto-created login account for student: ${name}`);
            console.log(`[STUDENTS] 🆔 Account ID: ${accountId}`);
            console.log(`[STUDENTS] 📱 Student can now login with:`);
            console.log(`[STUDENTS]    - Library Code: ${libraryCode}`);
            console.log(`[STUDENTS]    - Phone: ${phone}`);
            console.log(`[STUDENTS]    - Password: ${phone}`);
            console.log(`[STUDENTS] 🌐 Login URL: Student login available via the application`);
          } else {
            console.log(`[STUDENTS] ⚠️  Login account already exists for phone: ${phone} in library ${libraryId}`);
          }
        } else {
          console.log(`[STUDENTS] ❌ Cannot create login account - Missing required data:`);
          console.log(`[STUDENTS]    - Library ID: ${libraryId}`);
          console.log(`[STUDENTS]    - Phone: ${phone}`);
          console.log(`[STUDENTS]    - Name: ${name}`);
          console.log(`[STUDENTS]    - Session Type: ${req.session.owner ? 'owner' : req.session.user ? 'user' : 'none'}`);
          
          if (!libraryId) {
            console.log(`[STUDENTS] 💡 TIP: Make sure you're logged in as an owner to enable automatic student account creation`);
          }
        }
      } catch (accountError) {
        console.error('[STUDENTS] ❌ ERROR creating student login account:', accountError.message);
        console.error('[STUDENTS] ❌ Full error stack:', accountError.stack);
        // Don't fail the student creation if account creation fails
      }

      await client.query('COMMIT');

      res.status(201).json({
        student: {
          ...student,
          total_fee: parseFloat(student.total_fee || 0),
          amount_paid: parseFloat(student.amount_paid || 0),
          due_amount: parseFloat(student.due_amount || 0),
          cash: parseFloat(student.cash || 0),
          online: parseFloat(student.online || 0),
          security_money: parseFloat(student.security_money || 0),
          discount: parseFloat(student.discount || 0),
          remark: student.remark || '',
          profile_image_url: student.profile_image_url || '',
          aadhaar_front_url: student.aadhaar_front_url || '',
          aadhaar_back_url: student.aadhaar_back_url || '',
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error adding student:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  router.put('/:id', checkAdminOrStaff, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = parseInt(req.params.id, 10);
      
      const {
        name, email, phone, address, branch_id, membership_start, membership_end,
        total_fee, amount_paid, shift_ids, seat_id, cash, online, security_money, remark,
        registration_number, father_name, aadhar_number, profile_image_url, locker_id,
        aadhaar_front_url, aadhaar_back_url, discount, gender
      } = req.body;
      
      if (!name || !phone || !address || !branch_id || !membership_start || !membership_end) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Required fields missing: Name, Phone, Address, Branch, and Membership Dates are required.' });
      }

      const seatIdNum = seat_id ? parseInt(seat_id, 10) : null;
      const lockerIdNum = locker_id ? parseInt(locker_id, 10) : null;
      const shiftIdsNum = shift_ids && Array.isArray(shift_ids) ? shift_ids.map(sid => parseInt(sid, 10)) : [];
      
      const feeValue = parseFloat(total_fee || 0);
      const paidValue = parseFloat(amount_paid || 0);
      const discountValue = parseFloat(discount || 0);
      const dueAmountValue = feeValue - discountValue - paidValue;
      const status = new Date(membership_end) < new Date() ? 'expired' : 'active';

      if (lockerIdNum) {
        const lockerCheck = await client.query('SELECT is_assigned, student_id FROM locker WHERE id = $1', [lockerIdNum]);
        if (lockerCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} does not exist` });
        }
        if (lockerCheck.rows[0].is_assigned && lockerCheck.rows[0].student_id != id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} is already assigned to another student` });
        }
      }

      const previouslockerCheck = await client.query('SELECT locker_id FROM students WHERE id = $1', [id]);
      const previouslockerId = previouslockerCheck.rows[0].locker_id;
      if (previouslockerId) {
        await client.query('UPDATE locker SET is_assigned = false, student_id = NULL WHERE id = $1 AND library_id = $2', [previouslockerId, req.libraryId]);
      }

      const result = await client.query(
        `UPDATE students 
         SET name = $1, email = $2, phone = $3, address = $4, branch_id = $5,
             membership_start = $6, membership_end = $7, total_fee = $8, 
             amount_paid = $9, due_amount = $10, cash = $11, online = $12, 
             security_money = $13, remark = $14, status = $15, gender = $16,
             registration_number = $17, father_name = $18, aadhar_number = $19, 
             profile_image_url = $20, locker_id = $21, aadhaar_front_url = $22, aadhaar_back_url = $23, discount = $24
         WHERE id = $25 AND library_id = $26
         RETURNING *`,
        [
          name, email, phone, address, branch_id, membership_start, membership_end,
          feeValue, paidValue, dueAmountValue, cash, online,
          security_money, remark || null, status, gender || 'male',
          registration_number || null, father_name || null, aadhar_number || null, 
          profile_image_url || null, lockerIdNum, aadhaar_front_url || null, aadhaar_back_url || null, discountValue,
          id, req.libraryId
        ]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Student not found' });
      }
      
      const updatedStudent = result.rows[0];
      
      if (lockerIdNum) {
        await client.query(
          'UPDATE locker SET is_assigned = true, student_id = $1 WHERE id = $2',
          [id, lockerIdNum]
        );
      }

      // Update student_accounts table to keep login credentials in sync
      await client.query(
        'UPDATE student_accounts SET phone = $1, name = $2, email = $3, password = $4 WHERE student_id = $5 AND library_id = $6',
        [phone, name, email || null, phone, id, req.libraryId]
      );

      let firstShiftId = null;
      await client.query(
        'DELETE FROM seat_assignments WHERE student_id = $1 AND (library_id = $2 OR library_id IS NULL)',
        [id, req.libraryId]
      );
      if (shiftIdsNum.length > 0) {
        for (const shiftId of shiftIdsNum) {
          await client.query(
            'INSERT INTO seat_assignments (seat_id, shift_id, student_id, library_id) VALUES ($1, $2, $3, $4)',
            [seatIdNum, shiftId, id, req.libraryId]
          );
          if (!firstShiftId) firstShiftId = shiftId;
        }
      }
      
      await client.query(
        `UPDATE student_membership_history
         SET name = $1, email = $2, phone = $3, address = $4, gender = $5, membership_start = $6, membership_end = $7, status = $8,
             total_fee = $9, amount_paid = $10, due_amount = $11, cash = $12, online = $13, security_money = $14,
             remark = $15, seat_id = $16, shift_id = $17, branch_id = $18, registration_number = $19,
             father_name = $20, aadhar_number = $21, profile_image_url = $22, 
             aadhaar_front_url = $23, aadhaar_back_url = $24, locker_id = $25, discount = $26
         WHERE id = (SELECT id FROM student_membership_history WHERE student_id = $27 ORDER BY id DESC LIMIT 1) AND library_id = $28`,
         [
           updatedStudent.name, updatedStudent.email, updatedStudent.phone, updatedStudent.address, gender || 'male', updatedStudent.membership_start, updatedStudent.membership_end, updatedStudent.status,
           updatedStudent.total_fee, updatedStudent.amount_paid, updatedStudent.due_amount,
           updatedStudent.cash, updatedStudent.online, updatedStudent.security_money, updatedStudent.remark || '',
           seatIdNum, firstShiftId, updatedStudent.branch_id, updatedStudent.registration_number,
           updatedStudent.father_name, updatedStudent.aadhar_number, updatedStudent.profile_image_url || '',
           updatedStudent.aadhaar_front_url || '', updatedStudent.aadhaar_back_url || '', lockerIdNum, updatedStudent.discount,
           id, req.libraryId
         ]
      );
      
      await client.query('COMMIT');
      res.json({ student: {
        ...updatedStudent,
        total_fee: parseFloat(updatedStudent.total_fee || 0),
        amount_paid: parseFloat(updatedStudent.amount_paid || 0),
        due_amount: parseFloat(updatedStudent.due_amount || 0),
        cash: parseFloat(updatedStudent.cash || 0),
        online: parseFloat(updatedStudent.online || 0),
        security_money: parseFloat(updatedStudent.security_money || 0),
        discount: parseFloat(updatedStudent.discount || 0),
        remark: updatedStudent.remark || '',
        profile_image_url: updatedStudent.profile_image_url || '',
        aadhaar_front_url: updatedStudent.aadhaar_front_url || '',
        aadhaar_back_url: updatedStudent.aadhaar_back_url || '',
      } });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating student:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  router.delete('/:id', checkAdminOrStaff, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = parseInt(req.params.id, 10);

      // Break foreign-key style relationships so historical data remains
      await client.query(
        'UPDATE student_membership_history SET student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE attendance SET student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE student_accounts SET student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE queries SET student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE query_votes SET student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE query_comments SET commenter_id = NULL WHERE commenter_id = $1 AND commenter_role = $2 AND library_id = $3',
        [id, 'student', req.libraryId]
      );

      // Clean up seat/locker assignments
      await client.query(
        'DELETE FROM seat_assignments WHERE student_id = $1 AND (library_id = $2 OR library_id IS NULL)',
        [id, req.libraryId]
      );
      await client.query(
        'UPDATE locker SET is_assigned = false, student_id = NULL WHERE student_id = $1 AND library_id = $2',
        [id, req.libraryId]
      );

      const del = await client.query('DELETE FROM students WHERE id = $1 AND library_id = $2 RETURNING *', [id, req.libraryId]);
      if (!del.rows[0]) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Student not found' });
      }

      await client.query('COMMIT');
      return res.json({ message: 'Student deleted (collection data preserved)', student: del.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('DELETE /students/:id error:', err);
      return res.status(500).json({ message: 'Server error deleting student', error: err.message });
    } finally {
      client.release();
    }
  });

  // Dashboard stats with owner authentication and data isolation
  router.get('/stats/dashboard', authenticateOwnerOrStaff, ensureDataIsolation, async (req, res) => {
    try {
        const { branchId } = req.query;
        const libraryId = req.libraryId; // Added from ensureOwnerDataIsolation middleware
        const branchIdNum = branchId ? parseInt(branchId, 10) : null;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Start with library ID as the first parameter for all queries
        let params = [libraryId, startOfMonth, endOfMonth];
        let paramIndex = 3; // Next parameter index after libraryId and date range
        
        // Base queries with library_id filter
        let totalCollectionQuery = `
            SELECT COALESCE(SUM(h.amount_paid), 0) AS total 
            FROM student_membership_history h
            LEFT JOIN students s ON h.student_id = s.id
            WHERE h.library_id = $1 AND h.changed_at BETWEEN $2 AND $3`;
            
        let totalDueQuery = `
            SELECT COALESCE(SUM(h.due_amount), 0) AS total 
            FROM student_membership_history h
            LEFT JOIN students s ON h.student_id = s.id
            WHERE h.library_id = $1 AND h.changed_at BETWEEN $2 AND $3`;
            
        let totalExpenseQuery = `
            SELECT COALESCE(SUM(e.amount), 0) AS total 
            FROM expenses e 
            WHERE e.library_id = $1 AND e.date BETWEEN $2 AND $3`;

        // Add branch filter if provided
        if (branchIdNum) {
            totalCollectionQuery += ` AND h.branch_id = $${paramIndex + 1}`;
            totalDueQuery += ` AND h.branch_id = $${paramIndex + 1}`;
            totalExpenseQuery += ` AND e.branch_id = $${paramIndex + 1}`;
            params.push(branchIdNum);
            paramIndex++;
        }

        // Execute all queries in parallel
        const [
            totalCollectionResult, 
            totalDueResult, 
            totalExpenseResult
        ] = await Promise.all([
            pool.query(totalCollectionQuery, params),
            pool.query(totalDueQuery, params),
            pool.query(totalExpenseQuery, params)
        ]);

        // Parse results
        const totalCollection = parseFloat(totalCollectionResult.rows[0].total) || 0;
        const totalDue = parseFloat(totalDueResult.rows[0].total) || 0;
        const totalExpense = parseFloat(totalExpenseResult.rows[0].total) || 0;
        const profitLoss = totalCollection - totalExpense;

        res.json({
            totalCollection,
            totalDue,
            totalExpense,
            profitLoss
        });
    } catch (err) {
        console.error('Error in students/stats/dashboard route:', err.stack);
        res.status(500).json({ 
            message: 'Server error while fetching dashboard statistics', 
            error: err.message 
        });
    }
  });

  router.post('/:id/renew', checkAdminOrStaff, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const id = parseInt(req.params.id, 10);

      const {
        name, registration_number, father_name, aadhar_number, address,
        membership_start, membership_end, email, phone, branch_id,
        shift_ids, seat_id, total_fee, cash, online, security_money, remark,
        profile_image_url, aadhaar_front_url, aadhaar_back_url, locker_id, discount
      } = req.body;

      if (!membership_start || !membership_end || !name || !phone || !branch_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Required fields are missing' });
      }

      const branchIdNum = parseInt(branch_id, 10);
      const seatIdNum = seat_id ? parseInt(seat_id, 10) : null;
      const lockerIdNum = locker_id ? parseInt(locker_id, 10) : null;
      const shiftIdsNum = shift_ids && Array.isArray(shift_ids) ? shift_ids.map(sId => parseInt(sId, 10)) : [];

      const feeValue = parseFloat(total_fee || 0);
      const cashValue = parseFloat(cash || 0);
      const onlineValue = parseFloat(online || 0);
      const securityMoneyValue = parseFloat(security_money || 0);
      const discountValue = parseFloat(discount || 0);
      const amount_paid = cashValue + onlineValue;
      const due_amount = feeValue - discountValue - amount_paid;
      const status = new Date(membership_end) < new Date() ? 'expired' : 'active';

      if (seatIdNum && shiftIdsNum.length > 0) {
        for (const shiftId of shiftIdsNum) {
          const checkAssignment = await client.query(
            'SELECT 1 FROM seat_assignments WHERE seat_id = $1 AND shift_id = $2 AND student_id != $3',
            [seatIdNum, shiftId, id]
          );
          if (checkAssignment.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: `Seat is already assigned for shift ${shiftId}` });
          }
        }
      }

      if (lockerIdNum) {
        const lockerCheck = await client.query('SELECT is_assigned, student_id FROM locker WHERE id = $1', [lockerIdNum]);
        if (lockerCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} does not exist` });
        }
        if (lockerCheck.rows[0].is_assigned && lockerCheck.rows[0].student_id != id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ message: `locker with ID ${lockerIdNum} is already assigned to another student` });
        }
      }

      await client.query('UPDATE locker SET is_assigned = false, student_id = NULL WHERE student_id = $1 AND library_id = $2', [id, req.libraryId]);

      const upd = await client.query(
        `UPDATE students
         SET name = $1, registration_number = $2, father_name = $3, aadhar_number = $4, address = $5,
             membership_start = $6, membership_end = $7, status = $8,
             email = $9, phone = $10, branch_id = $11,
             total_fee = $12, amount_paid = $13, due_amount = $14,
             cash = $15, online = $16, security_money = $17, remark = $18,
             profile_image_url = $19, aadhaar_front_url = $20, aadhaar_back_url = $21, locker_id = $22, discount = $23
         WHERE id = $24 AND library_id = $25
         RETURNING *`,
        [
          name, registration_number, father_name, aadhar_number, address,
          membership_start, membership_end, status,
          email, phone, branchIdNum,
          feeValue, amount_paid, due_amount,
          cashValue, onlineValue, securityMoneyValue, remark || null,
          profile_image_url || null, aadhaar_front_url || null, aadhaar_back_url || null, lockerIdNum, discountValue,
          id, req.libraryId
        ]
      );

      if (upd.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Student not found' });
      }
      const updated = upd.rows[0];

      if (lockerIdNum) {
        await client.query(
          'UPDATE locker SET is_assigned = true, student_id = $1 WHERE id = $2',
          [id, lockerIdNum]
        );
      }

      // Update student_accounts table to keep login credentials in sync
      await client.query(
        'UPDATE student_accounts SET phone = $1, name = $2, email = $3, password = $4 WHERE student_id = $5 AND library_id = $6',
        [phone, name, email || null, phone, id, req.libraryId]
      );

      let firstShiftId = null;
      await client.query(
        'DELETE FROM seat_assignments WHERE student_id = $1 AND (library_id = $2 OR library_id IS NULL)',
        [id, req.libraryId]
      );
      if (shiftIdsNum.length > 0) {
        for (const shiftId of shiftIdsNum) {
          await client.query(
            'INSERT INTO seat_assignments (seat_id, shift_id, student_id, library_id) VALUES ($1, $2, $3, $4)',
            [seatIdNum, shiftId, id, req.libraryId]
          );
          if (!firstShiftId) firstShiftId = shiftId;
        }
      }

      await client.query(
        `INSERT INTO student_membership_history (
          student_id, name, email, phone, address,
          membership_start, membership_end, status,
          total_fee, amount_paid, due_amount,
          cash, online, security_money, remark,
          seat_id, shift_id, branch_id,
          registration_number, father_name, aadhar_number,
          profile_image_url, aadhaar_front_url, aadhaar_back_url,
          locker_id, discount, changed_at, library_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW(), $27)`,
        [
          updated.id, updated.name, updated.email, updated.phone, updated.address,
          updated.membership_start, updated.membership_end, updated.status,
          updated.total_fee, updated.amount_paid, updated.due_amount,
          updated.cash, updated.online, updated.security_money, updated.remark || '',
          seatIdNum, firstShiftId, branchIdNum,
          updated.registration_number, updated.father_name, updated.aadhar_number,
          updated.profile_image_url || '', updated.aadhaar_front_url || '', updated.aadhaar_back_url || '',
          lockerIdNum, updated.discount, req.libraryId
        ]
      );

      await client.query('COMMIT');

      // Fetch the complete updated student data with assignments
      const completeStudentQuery = `
        SELECT 
          s.id, s.name, s.phone, s.email, s.address, s.registration_number, 
          s.father_name, s.aadhar_number, s.membership_start, s.membership_end,
          s.total_fee, s.amount_paid, s.due_amount, s.cash, s.online, 
          s.security_money, s.remark, s.profile_image_url, s.aadhaar_front_url, 
          s.aadhaar_back_url, s.branch_id, s.discount, s.created_at,
          b.name as branch_name,
          l.locker_number,
          CASE
            WHEN s.membership_end < CURRENT_DATE THEN 'expired'
            ELSE 'active'
          END AS status
        FROM students s
        LEFT JOIN branches b ON s.branch_id = b.id
        LEFT JOIN locker l ON s.locker_id = l.id
        WHERE s.id = $1 AND s.library_id = $2
      `;
      
      const studentResult = await client.query(completeStudentQuery, [id, req.libraryId]);
      
      // Fetch seat assignments
      const assignmentsQuery = `
        SELECT 
          sa.seat_id, sa.shift_id, 
          se.seat_number, 
          sh.title as shift_title
        FROM seat_assignments sa
        LEFT JOIN seats se ON sa.seat_id = se.id
        LEFT JOIN schedules sh ON sa.shift_id = sh.id
        WHERE sa.student_id = $1 AND (sa.library_id = $2 OR sa.library_id IS NULL)
      `;
      
      const assignmentsResult = await client.query(assignmentsQuery, [id, req.libraryId]);
      
      const studentData = studentResult.rows[0];
      if (!studentData) {
        return res.status(404).json({ message: 'Student not found after renewal' });
      }

      res.json({
        message: 'Membership renewed',
        student: {
          ...studentData,
          total_fee: parseFloat(studentData.total_fee || 0),
          amount_paid: parseFloat(studentData.amount_paid || 0),
          due_amount: parseFloat(studentData.due_amount || 0),
          cash: parseFloat(studentData.cash || 0),
          online: parseFloat(studentData.online || 0),
          security_money: parseFloat(studentData.security_money || 0),
          discount: parseFloat(studentData.discount || 0),
          remark: studentData.remark || '',
          profile_image_url: studentData.profile_image_url || '',
          aadhaar_front_url: studentData.aadhaar_front_url || '',
          aadhaar_back_url: studentData.aadhaar_back_url || '',
          assignments: assignmentsResult.rows
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error in students/:id/renew route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  return router;
};