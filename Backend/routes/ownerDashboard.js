/*
Changes Made:
- DELETED all conflicting and incorrect /attendance routes.
- KEPT and REFINED a single, authoritative GET /attendance route to be the only source for fetching attendance data.
- CORRECTED the database query in the GET /attendance route to properly read from the `student_attendance` table, where QR code scan data is stored.
- ENHANCED the query to correctly aggregate daily records for each student, calculating their 'firstIn' and 'lastOut' times.
- ADDED robust filtering so the owner can view attendance by daily or monthly views and search by student details (name, phone, registration number).
- REMOVED other duplicate routes (like /profile) and obsolete endpoints to clean up the file and prevent conflicts.
*/

// Owner Dashboard Routes for Multi-tenant Library System
const express = require('express');
const { authenticateOwnerOrStaff, ensureDataIsolation } = require('./ownerAuth');

const createOwnerDashboardRouter = (pool) => {
  const router = express.Router();

  // Apply authentication and data isolation to all routes
  router.use(authenticateOwnerOrStaff);
  router.use(ensureDataIsolation);

  // Get Dashboard Statistics
  router.get('/stats', async (req, res) => {
    try {
      const libraryId = req.libraryId;
      const isStaff = req.session && req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'staff');

      // Base queries that all users can see
      const baseQueries = [
        pool.query('SELECT COUNT(*) FROM students WHERE library_id = $1', [libraryId]),
        pool.query('SELECT COUNT(*) FROM students WHERE library_id = $1 AND status = $2', [libraryId, 'active']),
        pool.query('SELECT COUNT(DISTINCT student_id) FROM student_attendance WHERE library_id = $1 AND DATE(created_at) = CURRENT_DATE AND action = \'in\'', [libraryId]),
        pool.query('SELECT COUNT(*) FROM seats WHERE library_id = $1', [libraryId]),
        pool.query('SELECT COUNT(DISTINCT s.id) FROM seats s JOIN schedules sch ON s.id = sch.seat_id JOIN students st ON sch.student_id = st.id WHERE s.library_id = $1 AND st.status = $2', [libraryId, 'active'])
      ];

      // Owner-only queries (financial data)
      const ownerOnlyQueries = isStaff ? [] : [
        pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE library_id = $1 AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)', [libraryId]),
        pool.query('SELECT COUNT(*) FROM students WHERE library_id = $1 AND membership_end < CURRENT_DATE AND status = $2', [libraryId, 'active'])
      ];

      const allQueries = [...baseQueries, ...ownerOnlyQueries];
      const results = await Promise.all(allQueries);

      const [
        totalStudents,
        activeStudents,
        todayAttendance,
        totalSeats,
        occupiedSeats,
        ...ownerOnlyResults
      ] = results;

      const response = {
        totalStudents: parseInt(totalStudents.rows[0].count),
        activeStudents: parseInt(activeStudents.rows[0].count),
        todayAttendance: parseInt(todayAttendance.rows[0].count),
        totalSeats: parseInt(totalSeats.rows[0].count),
        occupiedSeats: parseInt(occupiedSeats.rows[0].count)
      };

      // Only add financial data for owners
      if (!isStaff && ownerOnlyResults.length >= 2) {
        response.monthlyRevenue = parseFloat(ownerOnlyResults[0].rows[0].total);
        response.expiredMemberships = parseInt(ownerOnlyResults[1].rows[0].count);
      }

      res.json(response);

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error fetching stats:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get Students List with Pagination
  router.get('/students', async (req, res) => {
    try {
      const libraryId = req.libraryId;
      const { page = 1, limit = 10, search = '', status = '' } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE s.library_id = $1';
      let queryParams = [libraryId];
      let paramCount = 1;

      if (search) {
        paramCount++;
        whereClause += ` AND (s.name ILIKE $${paramCount} OR s.phone ILIKE $${paramCount} OR s.registration_number ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      if (status) {
        paramCount++;
        whereClause += ` AND s.status = $${paramCount}`;
        queryParams.push(status);
      }

      const studentsQuery = `
        SELECT s.id, s.name, s.phone, s.email, s.registration_number, s.status,
               s.membership_start, s.membership_end, se.seat_number, sh.name as shift_name
        FROM students s
        LEFT JOIN schedules sch ON s.id = sch.student_id
        LEFT JOIN seats se ON sch.seat_id = se.id
        LEFT JOIN shifts sh ON sch.shift_id = sh.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const [studentsResult, countResult] = await Promise.all([
        pool.query(studentsQuery, queryParams),
        pool.query(`SELECT COUNT(*) FROM students s ${whereClause}`, queryParams.slice(0, -2))
      ]);

      const totalStudents = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalStudents / limit);

      res.json({
        students: studentsResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalStudents,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error fetching students:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // THE SINGLE, CORRECTED ROUTE FOR FETCHING ATTENDANCE
  router.get('/attendance', async (req, res) => {
    try {
      const libraryId = req.libraryId;
      const { 
        date = new Date().toISOString().split('T')[0], 
        page = 1, 
        limit = 50, 
        search = '',
        view = 'daily', // 'daily' or 'monthly'
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear()
      } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE a.library_id = $1';
      let queryParams = [libraryId];
      let paramCount = 1;

      // Add date filtering based on view type
      if (view === 'daily') {
        paramCount++;
        whereClause += ` AND DATE(a.created_at) = $${paramCount}`;
        queryParams.push(date);
      } else if (view === 'monthly') {
        paramCount++;
        whereClause += ` AND EXTRACT(MONTH FROM a.created_at) = $${paramCount}`;
        queryParams.push(parseInt(month));
        paramCount++;
        whereClause += ` AND EXTRACT(YEAR FROM a.created_at) = $${paramCount}`;
        queryParams.push(parseInt(year));
      }

      // Add search functionality
      if (search && search.trim()) {
        paramCount++;
        whereClause += ` AND (s.name ILIKE $${paramCount} OR s.phone ILIKE $${paramCount} OR s.registration_number ILIKE $${paramCount})`;
        queryParams.push(`%${search.trim()}%`);
      }

      // Branch filter (if provided)
      if (req.query.branchId) {
        const branchIdInt = parseInt(req.query.branchId, 10);
        if (!isNaN(branchIdInt)) {
          paramCount++;
          whereClause += ` AND s.branch_id = $${paramCount}`;
          queryParams.push(branchIdInt);
        }
      }

      // This query reads from the correct `student_attendance` table and groups the results
      const attendanceQuery = `
        SELECT
          s.id as "studentId",
          s.name as "studentName",
          s.registration_number as "registrationNumber",
          s.phone,
          DATE(a.created_at) as date,
          MIN(CASE WHEN a.action = 'in' THEN a.created_at END) as "firstIn",
          MAX(CASE WHEN a.action = 'out' THEN a.created_at END) as "lastOut",
          COUNT(a.id) as "totalScans"
        FROM student_attendance a
        JOIN students s ON a.student_id = s.id
        ${whereClause}
        GROUP BY s.id, s.name, s.registration_number, s.phone, DATE(a.created_at)
        ORDER BY date DESC, "firstIn" DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      const queryParamsWithPagination = [...queryParams, parseInt(limit), offset];

      const countQuery = `
        SELECT COUNT(DISTINCT s.id) 
        FROM student_attendance a
        JOIN students s ON a.student_id = s.id
        ${whereClause}
      `;
      
      const countQueryParams = queryParams;

      const [attendanceResult, countResult] = await Promise.all([
        pool.query(attendanceQuery, queryParamsWithPagination),
        pool.query(countQuery, countQueryParams)
      ]);

      const totalRecords = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(totalRecords / limit);

      res.json({
        attendance: attendanceResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalRecords,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        view,
        filters: { date, month, year, search }
      });

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error fetching attendance:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get Library Profile
  router.get('/profile', async (req, res) => {
    try {
      const libraryId = req.libraryId;

      const result = await pool.query(
        'SELECT id, library_code, library_name, owner_name, owner_email, owner_phone, created_at, status FROM libraries WHERE id = $1',
        [libraryId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const library = result.rows[0];
      
      const formattedLibrary = {
        id: library.id,
        libraryCode: library.library_code,
        libraryName: library.library_name,
        ownerName: library.owner_name,
        ownerEmail: library.owner_email,
        ownerPhone: library.owner_phone,
        createdAt: library.created_at,
        status: library.status
      };

      res.json({ library: formattedLibrary });

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error fetching profile:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Update Library Profile
  router.put('/profile', async (req, res) => {
    try {
      const libraryId = req.libraryId;
      const { libraryName, ownerName, ownerPhone } = req.body;

      if (!libraryName || !ownerName || !ownerPhone) {
        return res.status(400).json({ message: 'Library name, owner name, and phone are required' });
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(ownerPhone)) {
        return res.status(400).json({ message: 'Phone number must be 10 digits' });
      }

      const result = await pool.query(
        'UPDATE libraries SET library_name = $1, owner_name = $2, owner_phone = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING library_name, owner_name, owner_phone',
        [libraryName, ownerName, ownerPhone, libraryId]
      );

      req.session.owner.libraryName = libraryName;
      req.session.owner.ownerName = ownerName;

      res.json({
        message: 'Profile updated successfully',
        library: result.rows[0]
      });

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error updating profile:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });
  
  // Get Library QR Code for Attendance
  router.get('/qr-code', async (req, res) => {
    try {
      const libraryId = req.libraryId;
      
      const libraryResult = await pool.query(
        'SELECT id, library_name, library_code FROM libraries WHERE id = $1',
        [libraryId]
      );

      if (libraryResult.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const library = libraryResult.rows[0];
      
      const qrData = {
        libraryId: library.id,
        libraryCode: library.library_code,
        libraryName: library.library_name,
        type: 'attendance',
        timestamp: new Date().toISOString()
      };

      res.json({
        qrData: JSON.stringify(qrData),
        library: {
          id: library.id,
          name: library.library_name,
          code: library.library_code
        }
      });

    } catch (error) {
      console.error('[OWNER_DASHBOARD] Error generating QR code:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};

module.exports = { createOwnerDashboardRouter };