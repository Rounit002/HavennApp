// Public Student Registration Routes
// Handles public-facing student registration without authentication
const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  // Get library information and registration form data by library code
  router.get('/library/:libraryCode', async (req, res) => {
    try {
      const { libraryCode } = req.params;

      // Get library information
      const libraryResult = await pool.query(
        'SELECT id, library_name, owner_name FROM libraries WHERE library_code = $1',
        [libraryCode.toUpperCase()]
      );

      if (libraryResult.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const library = libraryResult.rows[0];

      // Get branches for this library
      const branchesResult = await pool.query(
        'SELECT id, name FROM branches WHERE library_id = $1 ORDER BY name',
        [library.id]
      );

      // Get available seats
      const seatsResult = await pool.query(
        'SELECT id, seat_number FROM seats WHERE library_id = $1 ORDER BY seat_number',
        [library.id]
      );

      // Get available shifts/schedules
      const shiftsResult = await pool.query(
        'SELECT id, title, description, time FROM schedules WHERE library_id = $1 ORDER BY time',
        [library.id]
      );

      // Get available lockers
      const lockersResult = await pool.query(
        'SELECT id, locker_number FROM locker WHERE library_id = $1 AND is_assigned = false ORDER BY locker_number',
        [library.id]
      );

      res.json({
        library: {
          id: library.id,
          name: library.library_name,
          owner: library.owner_name,
          code: libraryCode.toUpperCase()
        },
        branches: branchesResult.rows,
        seats: seatsResult.rows,
        shifts: shiftsResult.rows,
        lockers: lockersResult.rows
      });

    } catch (error) {
      console.error('[PUBLIC_REGISTRATION] Error fetching library data:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Submit public registration request
  router.post('/library/:libraryCode/register', async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { libraryCode } = req.params;
      const {
        name, email, phone, address, branch_id, membership_start, membership_end,
        total_fee, amount_paid, shift_ids, seat_id, cash, online, security_money, 
        remark, profile_image_url, registration_number, father_name, aadhar_number, 
        locker_id, aadhaar_front_url, aadhaar_back_url, discount
      } = req.body;

      // Validate required fields
      if (!name || !phone || !branch_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Required fields missing: Name, Phone, and Branch are required.' 
        });
      }

      // Get library information
      const libraryResult = await client.query(
        'SELECT id FROM libraries WHERE library_code = $1',
        [libraryCode.toUpperCase()]
      );

      if (libraryResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Library not found' });
      }

      const libraryId = libraryResult.rows[0].id;

      // Check if phone number already exists in admission requests or students for this library
      const existingRequest = await client.query(
        'SELECT id FROM admission_requests WHERE phone = $1 AND library_id = $2 AND status = $3',
        [phone, libraryId, 'pending']
      );

      if (existingRequest.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'A registration request with this phone number is already pending for this library.' 
        });
      }

      const existingStudent = await client.query(
        'SELECT id FROM students WHERE phone = $1 AND library_id = $2',
        [phone, libraryId]
      );

      if (existingStudent.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'A student with this phone number already exists in this library.' 
        });
      }

      // Validate numeric fields
      const feeValue = parseFloat(total_fee || 0);
      const paidValue = parseFloat(amount_paid || 0);
      const discountValue = parseFloat(discount || 0);
      const cashValue = parseFloat(cash || 0);
      const onlineValue = parseFloat(online || 0);
      const securityMoneyValue = parseFloat(security_money || 0);
      const dueAmount = feeValue - discountValue - paidValue;

      // Parse IDs
      const branchIdNum = parseInt(branch_id, 10);
      const seatIdNum = seat_id ? parseInt(seat_id, 10) : null;
      const lockerIdNum = locker_id ? parseInt(locker_id, 10) : null;
      const shiftIdsJson = shift_ids && Array.isArray(shift_ids) ? JSON.stringify(shift_ids.map(id => parseInt(id, 10))) : null;

      // Insert admission request
      const result = await client.query(
        `INSERT INTO admission_requests (
          library_id, name, email, phone, address, branch_id, membership_start, membership_end,
          total_fee, amount_paid, due_amount, cash, online, security_money, discount,
          remark, profile_image_url, registration_number, father_name, aadhar_number,
          locker_id, aadhaar_front_url, aadhaar_back_url, shift_ids, seat_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
        RETURNING id, created_at`,
        [
          libraryId, name, email || null, phone, address || null, branchIdNum, 
          membership_start || null, membership_end || null, feeValue, paidValue, dueAmount,
          cashValue, onlineValue, securityMoneyValue, discountValue, remark || null,
          profile_image_url || null, registration_number || null, father_name || null, 
          aadhar_number || null, lockerIdNum, aadhaar_front_url || null, 
          aadhaar_back_url || null, shiftIdsJson, seatIdNum, 'pending'
        ]
      );

      await client.query('COMMIT');

      res.status(201).json({
        message: 'Registration request submitted successfully!',
        requestId: result.rows[0].id,
        submittedAt: result.rows[0].created_at,
        status: 'pending',
        note: 'Your registration request has been sent to the library administration for review. You will be contacted once your request is processed.'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PUBLIC_REGISTRATION] Error submitting registration:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    } finally {
      client.release();
    }
  });

  // Get registration status by phone and library code (for students to check their status)
  router.get('/library/:libraryCode/status/:phone', async (req, res) => {
    try {
      const { libraryCode, phone } = req.params;

      // Get library information
      const libraryResult = await pool.query(
        'SELECT id, library_name FROM libraries WHERE library_code = $1',
        [libraryCode.toUpperCase()]
      );

      if (libraryResult.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const libraryId = libraryResult.rows[0].id;

      // Check admission request status
      const requestResult = await pool.query(
        `SELECT id, name, status, created_at, updated_at, processed_at, rejection_reason
         FROM admission_requests 
         WHERE phone = $1 AND library_id = $2 
         ORDER BY created_at DESC LIMIT 1`,
        [phone, libraryId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ 
          message: 'No registration request found for this phone number in this library.' 
        });
      }

      const request = requestResult.rows[0];
      
      res.json({
        library: {
          name: libraryResult.rows[0].library_name,
          code: libraryCode.toUpperCase()
        },
        request: {
          id: request.id,
          name: request.name,
          status: request.status,
          submittedAt: request.created_at,
          lastUpdated: request.updated_at,
          processedAt: request.processed_at,
          rejectionReason: request.rejection_reason
        }
      });

    } catch (error) {
      console.error('[PUBLIC_REGISTRATION] Error checking status:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  return router;
};
