// Student Authentication Routes for Multi-tenant Library System
const express = require('express');

const createStudentAuthRouter = (pool) => {
  const router = express.Router();

  // Student Login
  router.post('/login', async (req, res) => {
    try {
      const { libraryCode, phone, password } = req.body;
      
      console.log(`[STUDENT_AUTH] Login attempt - Library: ${libraryCode}, Phone: ${phone}, Password: ${password}`);

      if (!libraryCode || !phone || !password) {
        console.log('[STUDENT_AUTH] Missing required fields');
        return res.status(400).json({ message: 'Library code, phone number, and password are required' });
      }

      // Find library by code
      const libraryResult = await pool.query(
        'SELECT id, library_name, status FROM libraries WHERE library_code = $1',
        [libraryCode.toUpperCase()]
      );
      
      console.log(`[STUDENT_AUTH] Library search result:`, libraryResult.rows);

      if (libraryResult.rows.length === 0) {
        console.log(`[STUDENT_AUTH] Library not found for code: ${libraryCode}`);
        return res.status(401).json({ message: 'Invalid library code' });
      }

      const library = libraryResult.rows[0];

      // Check if library is active
      if (library.status !== 'active') {
        return res.status(401).json({ message: 'Library is currently inactive. Please contact your library.' });
      }

      // Find student account
      const studentAccountResult = await pool.query(
        'SELECT sa.id, sa.student_id, sa.last_login, sa.status, s.name, s.phone, s.email, s.registration_number, s.branch_id FROM student_accounts sa JOIN students s ON sa.student_id = s.id WHERE sa.library_id = $1 AND sa.phone = $2',
        [library.id, phone]
      );
      
      console.log(`[STUDENT_AUTH] Student account search for library_id: ${library.id}, phone: ${phone}`);
      console.log(`[STUDENT_AUTH] Student account result:`, studentAccountResult.rows);

      if (studentAccountResult.rows.length === 0) {
        console.log(`[STUDENT_AUTH] Student account not found for phone: ${phone} in library: ${library.id}`);
        return res.status(401).json({ message: 'Student account not found. Please contact your library.' });
      }

      const studentAccount = studentAccountResult.rows[0];

      // Check if student account is active
      if (studentAccount.status !== 'active') {
        return res.status(401).json({ message: 'Student account is inactive. Please contact your library.' });
      }

      // Verify password (password should be same as phone number)
      if (password !== phone) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await pool.query(
        'UPDATE student_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [studentAccount.id]
      );

      // Create session
      req.session.student = {
        id: studentAccount.student_id,
        accountId: studentAccount.id,
        libraryId: library.id,
        branchId: studentAccount.branch_id, // Add branchId to session
        libraryCode: libraryCode.toUpperCase(),
        libraryName: library.library_name,
        name: studentAccount.name,
        phone: studentAccount.phone,
        email: studentAccount.email,
        registrationNumber: studentAccount.registration_number,
        role: 'student',
      };

      console.log(`[STUDENT_AUTH] Student ${studentAccount.name} logged in for library ${libraryCode}`);

      res.json({
        message: 'Login successful',
        student: {
          id: studentAccount.student_id,
          libraryCode: libraryCode.toUpperCase(),
          libraryName: library.library_name,
          name: studentAccount.name,
          phone: studentAccount.phone,
          email: studentAccount.email,
          registrationNumber: studentAccount.registration_number,
          branchId: studentAccount.branch_id, // Add branchId to response
          role: 'student',
        }
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Login error:', error);
      res.status(500).json({ message: 'Server error during login', error: error.message });
    }
  });

  // Student Logout
  router.post('/logout', (req, res) => {
    const studentName = req.session?.student?.name || 'Unknown';
    req.session.destroy((err) => {
      if (err) {
        console.error('[STUDENT_AUTH] Logout error for student:', studentName, err);
        return res.status(500).json({ message: 'Could not log out, please try again.' });
      }
      res.clearCookie('connect.sid');
      console.log(`[STUDENT_AUTH] Student ${studentName} logged out successfully.`);
      res.json({ message: 'Logout successful' });
    });
  });

  // Check Student Authentication Status
  router.get('/status', (req, res) => {
    try {
      if (req.session && req.session.student) {
        return res.json({
          isAuthenticated: true,
          student: req.session.student
        });
      }
      return res.json({ isAuthenticated: false, student: null });
    } catch (error) {
      console.error('[STUDENT_AUTH] Error in /status:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // Get Student Profile
  router.get('/profile', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;

      console.log(`[STUDENT_PROFILE] Fetching for studentId: ${studentId}, libraryId: ${libraryId}`);
      console.log(`[STUDENT_PROFILE] Session data:`, req.session.student);

      const result = await pool.query(
        `SELECT s.id, s.name, s.phone, s.email, s.admission_no as registration_number, s.address, 
                s.membership_start, s.membership_end, s.status, s.total_fee, s.amount_paid, 
                s.due_amount, s.cash, s.online, s.security_money, s.discount, s.father_name, 
                s.remark, s.branch_id, s.profile_image_url
         FROM students s
         WHERE s.id = $1 AND s.library_id = $2`,
        [studentId, libraryId]
      );

      console.log(`[STUDENT_PROFILE] Query result: ${result.rows.length} rows found`);
      console.log(`[STUDENT_PROFILE] Student data:`, result.rows[0]);

      if (result.rows.length === 0) {
        console.log(`[STUDENT_PROFILE] No student found with id: ${studentId}, library_id: ${libraryId}`);
        return res.status(404).json({ message: 'Student profile not found' });
      }

      const student = result.rows[0];
      
      // Fetch seat assignments
      const assignmentsResult = await pool.query(
        `SELECT sa.seat_id, sa.shift_id, seats.seat_number, sch.title AS shift_title
         FROM seat_assignments sa
         LEFT JOIN seats ON sa.seat_id = seats.id
         LEFT JOIN schedules sch ON sa.shift_id = sch.id
         WHERE sa.student_id = $1 AND sa.library_id = $2`,
        [studentId, libraryId]
      );
      
      student.assignments = assignmentsResult.rows;
      
      res.json({ student });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching profile:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Mark Attendance
  router.post('/attendance', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;
      const { notes } = req.body;

      // Check if attendance already marked for today
      const existingAttendance = await pool.query(
        'SELECT id FROM attendance WHERE student_id = $1 AND library_id = $2 AND date = CURRENT_DATE',
        [studentId, libraryId]
      );

      if (existingAttendance.rows.length > 0) {
        return res.status(400).json({ message: 'Attendance already marked for today' });
      }

      // Mark attendance
      const result = await pool.query(
        `INSERT INTO attendance (library_id, student_id, status, notes)
         VALUES ($1, $2, 'present', $3)
         RETURNING id, check_in_time, date`,
        [libraryId, studentId, notes || null]
      );

      const attendance = result.rows[0];

      console.log(`[STUDENT_AUTH] Attendance marked for student ${req.session.student.name}`);

      res.json({
        message: 'Attendance marked successfully',
        attendance: {
          id: attendance.id,
          checkInTime: attendance.check_in_time,
          date: attendance.date,
          status: 'present'
        }
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error marking attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get Student Attendance History (Daily/Monthly)
  router.get('/attendance', async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;
      const { 
        view = 'daily',
        date = new Date().toISOString().split('T')[0],
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear()
      } = req.query;

      let whereClause = 'WHERE student_id = $1 AND library_id = $2';
      let queryParams = [studentId, libraryId];
      let paramCount = 2;

      if (view === 'daily') {
        paramCount++;
        whereClause += ` AND DATE(created_at) = $${paramCount}`;
        queryParams.push(date);
      } else if (view === 'monthly') {
        paramCount++;
        whereClause += ` AND EXTRACT(MONTH FROM created_at) = $${paramCount}`;
        queryParams.push(parseInt(month, 10));
        paramCount++;
        whereClause += ` AND EXTRACT(YEAR FROM created_at) = $${paramCount}`;
        queryParams.push(parseInt(year, 10));
      }

      const result = await pool.query(
        `
        SELECT
          DATE(created_at) as date,
          MIN(CASE WHEN action = 'in' THEN created_at END) as "firstIn",
          MAX(CASE WHEN action = 'out' THEN created_at END) as "lastOut",
          CASE
            WHEN MIN(CASE WHEN action = 'in' THEN created_at END) IS NOT NULL
             AND MAX(CASE WHEN action = 'out' THEN created_at END) IS NOT NULL
            THEN TO_CHAR(
              (MAX(CASE WHEN action = 'out' THEN created_at END) - MIN(CASE WHEN action = 'in' THEN created_at END)),
              'HH24:MI:SS'
            )
            ELSE NULL
          END as "totalHours"
        FROM student_attendance
        ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        `,
        queryParams
      );

      res.json({ attendance: result.rows });
    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Mark Attendance via QR Code (Check-in/Check-out)
  router.post('/attendance/qr', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;
      const { qrData, notes = "" } = req.body; // action: 'in' or 'out'

      if (!qrData) {
        return res
          .status(400)
          .json({ message: "QR data and action (in/out) are required" });
      }

      // Parse and verify QR code
      let parsedQrData;
      try {
        parsedQrData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      } catch (error) {
        console.error('[STUDENT_AUTH] QR code parsing error:', error);
        return res.status(400).json({ message: 'Invalid QR code format' });
      }

      console.log('[STUDENT_AUTH] QR Code Data:', parsedQrData);
      console.log('[STUDENT_AUTH] Student Library ID:', libraryId);
      console.log('[STUDENT_AUTH] QR Library ID:', parsedQrData.libraryId);
      console.log('[STUDENT_AUTH] QR Type:', parsedQrData.type);

      // Verify QR code belongs to the student's library
      // Convert both to numbers for comparison to handle type mismatches
      const qrLibraryId = parseInt(parsedQrData.libraryId);
      const studentLibraryId = parseInt(libraryId);
      
      if (
        qrLibraryId !== studentLibraryId ||
        parsedQrData.type !== "attendance"
      ) {
        console.error('[STUDENT_AUTH] QR verification failed:', {
          qrLibraryId,
          studentLibraryId,
          qrType: parsedQrData.type,
          match: qrLibraryId === studentLibraryId
        });
        return res
          .status(400)
          .json({ message: "Invalid QR code for this library" });
      }

      console.log('[STUDENT_AUTH] QR code verification successful');

      // Use database CURRENT_DATE to avoid timezone mismatches between server and DB
      // This ensures we correctly identify today's records irrespective of server timezone.
      // No need to pass a separate date parameter; the DB handles the current date consistently.
      const lastEntry = await pool.query(
        `SELECT action FROM student_attendance 
         WHERE student_id = $1 AND library_id = $2 AND DATE(created_at) = CURRENT_DATE
         ORDER BY created_at DESC LIMIT 1`,
        [studentId, libraryId]
      );

      const lastAction = lastEntry.rows.length > 0 ? lastEntry.rows[0].action.trim() : null;
      const nextAction = lastAction === 'in' ? 'out' : 'in';

      // Insert the new attendance record
      const result = await pool.query(
        `INSERT INTO student_attendance (library_id, student_id, action, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, action, created_at as timestamp`,
        [libraryId, studentId, nextAction, notes]
      );

      const newAttendance = result.rows[0];
      const friendlyAction = nextAction === 'in' ? 'Checked In' : 'Checked Out';

      res.status(201).json({
        message: `${friendlyAction} successfully.`,
        attendance: newAttendance
      });
    } catch (error) {
      console.error("[STUDENT_AUTH] Error with QR attendance:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  });

  // Check Today's Attendance Status
  router.get('/attendance/today', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;

      const result = await pool.query(
        'SELECT id, check_in_time, status FROM attendance WHERE student_id = $1 AND library_id = $2 AND date = CURRENT_DATE',
        [studentId, libraryId]
      );

      const hasMarkedToday = result.rows.length > 0;
      const todayAttendance = hasMarkedToday ? result.rows[0] : null;

      res.json({
        hasMarkedToday,
        todayAttendance
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error checking today\'s attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Verify Barcode for Attendance
  router.post('/verify-barcode', authenticateStudent, async (req, res) => {
    try {
      const { barcode } = req.body;
      const libraryId = req.session.student.libraryId;
      const libraryCode = req.session.student.libraryCode;

      if (!barcode) {
        return res.status(400).json({ message: 'Barcode is required' });
      }

      // Verify that the scanned barcode matches the student's library
      // The barcode should contain the library code or be specifically generated for this library
      const expectedBarcodePattern = `LIBRARY_${libraryCode}_${libraryId}`;
      
      if (barcode !== expectedBarcodePattern && !barcode.includes(libraryCode)) {
        console.log(`[STUDENT_AUTH] Invalid barcode: ${barcode} for library: ${libraryCode}`);
        return res.status(403).json({ 
          message: 'This barcode does not belong to your registered library. Please use your library\'s barcode only.' 
        });
      }

      console.log(`[STUDENT_AUTH] Barcode verified successfully for library: ${libraryCode}`);
      res.json({ 
        message: 'Barcode verified successfully',
        libraryName: req.session.student.libraryName 
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error verifying barcode:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Manual Time Entry for Attendance
  router.post('/attendance/manual', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;
      const { type, time, notes } = req.body;

      if (!type || !time) {
        return res.status(400).json({ message: 'Entry type and time are required' });
      }

      if (!['in', 'out'].includes(type)) {
        return res.status(400).json({ message: 'Entry type must be "in" or "out"' });
      }

      // Check if attendance already exists for today
      const existingAttendance = await pool.query(
        'SELECT id, check_in_time, check_out_time FROM attendance WHERE student_id = $1 AND library_id = $2 AND date = CURRENT_DATE',
        [studentId, libraryId]
      );

      if (type === 'in') {
        if (existingAttendance.rows.length > 0) {
          return res.status(400).json({ message: 'Check-in already recorded for today' });
        }

        // Create new attendance record with manual check-in time
        const result = await pool.query(
          `INSERT INTO attendance (library_id, student_id, status, notes, check_in_time, date)
           VALUES ($1, $2, 'present', $3, $4, CURRENT_DATE)
           RETURNING id, check_in_time, date`,
          [libraryId, studentId, notes || 'Manual check-in', `${time}:00`]
        );

        const attendance = result.rows[0];
        console.log(`[STUDENT_AUTH] Manual check-in recorded for student ${req.session.student.name} at ${time}`);

        res.json({
          message: 'Check-in recorded successfully',
          attendance: {
            id: attendance.id,
            checkInTime: attendance.check_in_time,
            date: attendance.date,
            status: 'present'
          }
        });
      } else {
        // Handle check-out
        if (existingAttendance.rows.length === 0) {
          return res.status(400).json({ message: 'No check-in record found for today. Please check in first.' });
        }

        const attendanceRecord = existingAttendance.rows[0];
        if (attendanceRecord.check_out_time) {
          return res.status(400).json({ message: 'Check-out already recorded for today' });
        }

        // Update existing record with check-out time
        const result = await pool.query(
          `UPDATE attendance SET check_out_time = $1, notes = COALESCE(notes || ' | ', '') || $2
           WHERE id = $3
           RETURNING id, check_in_time, check_out_time, date`,
          [`${time}:00`, notes || 'Manual check-out', attendanceRecord.id]
        );

        const attendance = result.rows[0];
        console.log(`[STUDENT_AUTH] Manual check-out recorded for student ${req.session.student.name} at ${time}`);

        res.json({
          message: 'Check-out recorded successfully',
          attendance: {
            id: attendance.id,
            checkInTime: attendance.check_in_time,
            checkOutTime: attendance.check_out_time,
            date: attendance.date,
            status: 'present'
          }
        });
      }

    } catch (error) {
      console.error('[STUDENT_AUTH] Error with manual time entry:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Barcode verification and attendance marking endpoint
  router.post('/verify-barcode', authenticateStudent, async (req, res) => {
    try {
      const { barcode } = req.body;
      const studentSession = req.session.student;
      
      console.log(`[STUDENT_AUTH] Barcode verification attempt by student ${studentSession.id}`);
      console.log(`[STUDENT_AUTH] Scanned barcode:`, barcode);
      
      if (!barcode) {
        return res.status(400).json({ message: 'Barcode data is required' });
      }
      
      let barcodeData;
      try {
        barcodeData = JSON.parse(barcode);
      } catch (error) {
        return res.status(400).json({ message: 'Invalid barcode format' });
      }
      
      // Verify barcode belongs to student's library
      if (barcodeData.libraryCode !== studentSession.libraryCode || 
          barcodeData.libraryId !== studentSession.libraryId) {
        console.log(`[STUDENT_AUTH] Library code mismatch - Expected: ${studentSession.libraryCode}, Got: ${barcodeData.libraryCode}`);
        return res.status(403).json({ message: 'This barcode belongs to a different library' });
      }
      
      // Mark attendance automatically after successful verification
      const attendanceResult = await markToggleAttendance(pool, studentSession);
      
      res.json({
        message: 'Barcode verified and attendance marked successfully',
        attendance: attendanceResult
      });
      
    } catch (error) {
      console.error('[STUDENT_AUTH] Error verifying barcode:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Toggle attendance endpoint (for direct attendance marking)
  router.post('/attendance/toggle', authenticateStudent, async (req, res) => {
    try {
      const studentSession = req.session.student;
      const { notes } = req.body;
      
      console.log(`[STUDENT_AUTH] Toggle attendance for student ${studentSession.id}`);
      
      const attendanceResult = await markToggleAttendance(pool, studentSession, notes);
      
      res.json({
        message: `Successfully ${attendanceResult.action}!`,
        attendance: attendanceResult
      });
      
    } catch (error) {
      console.error('[STUDENT_AUTH] Error toggling attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Get student's attendance history
  router.get('/attendance-history', authenticateStudent, async (req, res) => {
    try {
      const studentSession = req.session.student;
      const { limit = 30 } = req.query;
      
      const attendanceResult = await pool.query(`
        SELECT 
          MIN(id) as id,
          DATE(created_at) as date,
          MIN(CASE WHEN action = 'in' THEN created_at END) as first_in,
          MAX(CASE WHEN action = 'out' THEN created_at END) as last_out,
          COUNT(*) as total_scans,
          STRING_AGG(DISTINCT notes, '; ') as notes
        FROM student_attendance 
        WHERE student_id = $1 AND library_id = $2
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT $3
      `, [studentSession.id, studentSession.libraryId, parseInt(limit)]);
      
      res.json({
        attendance: attendanceResult.rows
      });
      
    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching attendance history:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Get today's attendance status
  router.get('/attendance/today', authenticateStudent, async (req, res) => {
    try {
      const studentSession = req.session.student;
      
      const todayAttendance = await getTodayAttendanceStatus(pool, studentSession);
      
      res.json(todayAttendance);
      
    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching today\'s attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get Student Membership History - Grouped by Month
  router.get('/membership-history', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const libraryId = req.session.student.libraryId;

      console.log(`[MEMBERSHIP_HISTORY] Fetching for studentId: ${studentId}, libraryId: ${libraryId}`);
      
      // First, get all membership records for the student
      const result = await pool.query(
        `SELECT 
          smh.id, 
          smh.membership_start, 
          smh.membership_end, 
          COALESCE(smh.total_fee, 0) AS total_fee,
          (COALESCE(smh.cash, 0) + COALESCE(smh.online, 0)) AS amount_paid,
          (COALESCE(smh.total_fee, 0) - (COALESCE(smh.cash, 0) + COALESCE(smh.online, 0))) AS due_amount,
          smh.changed_at, 
          smh.status,
          smh.shift_id, 
          smh.seat_id, 
          smh.email, 
          smh.phone, 
          smh.address,
          smh.profile_image_url, 
          smh.name, 
          smh.cash, 
          smh.online, 
          smh.remark,
          -- Extract year and month for grouping
          TO_CHAR(smh.membership_start, 'YYYY-MM') as month_year,
          -- Format month name and year for display
          TO_CHAR(smh.membership_start, 'Month YYYY') as month_display
        FROM student_membership_history smh
        WHERE smh.student_id = $1
        ORDER BY smh.membership_start DESC`,
        [studentId]
      );

      console.log(`[MEMBERSHIP_HISTORY] Found ${result.rows.length} records for student ${studentId}`);

      // Group records by month
      const monthlyData = result.rows.reduce((acc, record) => {
        const monthKey = record.month_year;
        if (!acc[monthKey]) {
          acc[monthKey] = {
            month: record.month_display,
            records: [],
            totalFee: 0,
            totalPaid: 0,
            totalDue: 0
          };
        }
        acc[monthKey].records.push(record);
        acc[monthKey].totalFee += parseFloat(record.total_fee || 0);
        acc[monthKey].totalPaid += parseFloat(record.amount_paid || 0);
        acc[monthKey].totalDue += parseFloat(record.due_amount || 0);
        return acc;
      }, {});

      // Convert to array for easier frontend consumption
      const monthlySummary = Object.values(monthlyData);

      res.json({ 
        membershipHistory: result.rows,
        monthlySummary,
        totalRecords: result.rows.length
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching membership history:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get Student Transactions History
  router.get('/transactions', authenticateStudent, async (req, res) => {
    try {
      const studentId = req.session.student.id;
      const { limit = 50 } = req.query;

      console.log(`Fetching transactions for studentId: ${studentId}`);

      const result = await pool.query(
        `SELECT st.id, st.amount, st.date, st.created_at, st.type
         FROM student_transactions st
         WHERE st.student_id = $1
         ORDER BY st.date DESC, st.created_at DESC
         LIMIT $2`,
        [studentId, parseInt(limit)]
      );

      res.json({ 
        transactions: result.rows,
        totalRecords: result.rows.length
      });

    } catch (error) {
      console.error('[STUDENT_AUTH] Error fetching transactions:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};

// Helper function to mark toggle attendance
async function markToggleAttendance(pool, studentSession, notes = null) {
  // Use database CURRENT_DATE to ensure accurate date comparison
  // This prevents issues where timezone differences cause the day to be off by ±1.
  // No separate today variable needed.
  const todayRecords = await pool.query(`
    SELECT action, created_at 
    FROM student_attendance 
    WHERE student_id = $1 AND library_id = $2 AND DATE(created_at) = CURRENT_DATE
    ORDER BY created_at DESC
  `, [studentSession.id, studentSession.libraryId]);
  
  // Determine next action based on last record
  let nextAction = 'in';
  if (todayRecords.rows.length > 0) {
    const lastAction = todayRecords.rows[0].action;
    nextAction = lastAction === 'in' ? 'out' : 'in';
  }
  
  // Insert new attendance record
  const attendanceResult = await pool.query(`
    INSERT INTO student_attendance (student_id, library_id, action, notes, created_at)
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
    RETURNING *
  `, [studentSession.id, studentSession.libraryId, nextAction, notes]);
  
  return {
    action: nextAction === 'in' ? 'checked in' : 'checked out',
    record: attendanceResult.rows[0],
    totalToday: todayRecords.rows.length + 1
  };
}

// Helper function to get today's attendance status
async function getTodayAttendanceStatus(pool, studentSession) {
  // Use CURRENT_DATE in the query for consistent date handling
  const todayRecords = await pool.query(`
    SELECT 
      action, 
      created_at,
      notes
    FROM student_attendance 
    WHERE student_id = $1 AND library_id = $2 AND DATE(created_at) = CURRENT_DATE
    ORDER BY created_at ASC
  `, [studentSession.id, studentSession.libraryId]);
  
  const records = todayRecords.rows;
  
  if (records.length === 0) {
    return {
      hasMarkedToday: false,
      nextAction: 'in',
      totalScans: 0
    };
  }
  
  const firstIn = records.find(r => r.action === 'in');
  const lastOut = records.filter(r => r.action === 'out').pop();
  const lastRecord = records[records.length - 1];
  
  return {
    hasMarkedToday: true,
    nextAction: lastRecord.action === 'in' ? 'out' : 'in',
    totalScans: records.length,
    firstIn: firstIn ? firstIn.created_at : null,
    lastOut: lastOut ? lastOut.created_at : null,
    currentStatus: lastRecord.action === 'in' ? 'checked_in' : 'checked_out'
  };
}

// Middleware to authenticate student
const authenticateStudent = (req, res, next) => {
  if (req.session && req.session.student && req.session.student.id) {
    return next();
  } else {
    console.warn('[STUDENT_AUTH] Student not authenticated for path:', req.path);
    return res.status(401).json({ message: 'Unauthorized - Please log in as student' });
  }
};

module.exports = {
  createStudentAuthRouter,
  authenticateStudent
};
