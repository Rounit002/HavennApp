// routes/ownerAuth.js
// Owner Authentication Routes for Multi-tenant Library System
const express = require('express');
const bcrypt = require('bcrypt');

const createOwnerAuthRouter = (pool) => {
  const router = express.Router();

  // Helper to detect DB auth/SCRAM errors
  const isDbAuthError = (err) => {
    if (!err || !err.message) return false;
    const msg = err.message.toLowerCase();
    return msg.includes('sasl') || msg.includes('scram') || msg.includes('server signature') || msg.includes('authentication failed') || msg.includes('28p01');
  };

  // Consistent DB auth error response
  const handleDbAuthError = (res, err) => {
    return res.status(500).json({
      message: 'Database authentication failed. Check DB credentials and SSL settings in environment variables. If using DATABASE_URL on a platform like Render, ensure SSL is enabled.',
      error: err.message
    });
  };

  // Owner Registration
  router.post('/register', async (req, res) => {
    try {
      const { 
        ownerName, 
        ownerEmail, 
        ownerPhone, 
        libraryName, 
        password, 
        confirmPassword,
        libraryCode 
      } = req.body;

      // Validation
      if (!ownerName || !ownerEmail || !ownerPhone || !libraryName || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ownerEmail)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(ownerPhone)) {
        return res.status(400).json({ message: 'Phone number must be 10 digits' });
      }

      // Check if email already exists
      const emailExists = await pool.query(
        'SELECT id FROM libraries WHERE owner_email = $1',
        [ownerEmail]
      );

      if (emailExists.rows.length > 0) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      // Check if phone already exists
      const phoneCheck = await pool.query(
        'SELECT id FROM libraries WHERE owner_phone = $1',
        [ownerPhone]
      );

      if (phoneCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Phone number already registered' });
      }

      // Generate or validate library code
      let finalLibraryCode;
      const codeRegex = /^[A-Z0-9]{3,20}$/; // Consistent regex for validation

      if (libraryCode) {
        const upperCaseCode = libraryCode.toUpperCase();
        
        // Validate library code format
        if (!codeRegex.test(upperCaseCode)) {
          return res.status(400).json({ 
            message: 'Library code must be 3-20 characters long and contain only letters and numbers' 
          });
        }

        // Check if provided library code is available
        const codeCheck = await pool.query(
          'SELECT id FROM libraries WHERE library_code = $1',
          [upperCaseCode]
        );

        if (codeCheck.rows.length > 0) {
          return res.status(400).json({ message: 'Library code already taken' });
        }

        finalLibraryCode = upperCaseCode;
      } else {
        // Generate unique library code
        const codeResult = await pool.query('SELECT generate_library_code() as code');
        finalLibraryCode = codeResult.rows[0].code;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Set trial period dates (14 days free trial)
      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 14);

      // Insert new library owner
      const result = await pool.query(
        `INSERT INTO libraries (library_code, library_name, owner_name, owner_email, owner_phone, password, subscription_plan, subscription_start_date, subscription_end_date, is_trial, is_subscription_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, library_code, library_name, owner_name, owner_email, created_at, subscription_plan, subscription_start_date, subscription_end_date, is_trial, is_subscription_active`,
        [finalLibraryCode, libraryName, ownerName, ownerEmail, ownerPhone, hashedPassword, 'free_trial', subscriptionStartDate, subscriptionEndDate, true, true]
      );

      const newLibrary = result.rows[0];
      console.log(`[OWNER_AUTH] New library registered: ${newLibrary.library_name} (${newLibrary.library_code})`);

      res.status(201).json({
        message: 'Library registered successfully',
        library: {
          id: newLibrary.id,
          libraryCode: newLibrary.library_code,
          libraryName: newLibrary.library_name,
          ownerName: newLibrary.owner_name,
          ownerEmail: newLibrary.owner_email,
          createdAt: newLibrary.created_at
        }
      });

    } catch (error) {
      console.error('[OWNER_AUTH] Registration error:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      res.status(500).json({ message: 'Server error during registration', error: error.message });
    }
  });

  // Owner Login
  router.post('/login', async (req, res) => {
    try {
      const { phone, password } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ message: 'Phone number and password are required' });
      }

      // Find library by owner phone
      const result = await pool.query(
        'SELECT id, library_code, library_name, owner_name, owner_email, password, status FROM libraries WHERE owner_phone = $1',
        [phone]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const library = result.rows[0];

      // Check if library is active
      if (library.status !== 'active') {
        return res.status(401).json({ message: 'Library account is suspended. Please contact support.' });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, library.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Create session
      req.session.owner = {
        id: library.id,
        libraryCode: library.library_code,
        libraryName: library.library_name,
        ownerName: library.owner_name,
        ownerEmail: library.owner_email,
        role: 'owner'
      };

      console.log(`[OWNER_AUTH] Owner ${library.owner_name} logged in for library ${library.library_code}`);

      res.json({
        message: 'Login successful',
        owner: {
          id: library.id,
          libraryCode: library.library_code,
          libraryName: library.library_name,
          ownerName: library.owner_name,
          ownerEmail: library.owner_email,
          role: 'owner'
        }
      });

    } catch (error) {
      console.error('[OWNER_AUTH] Login error:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      res.status(500).json({ message: 'Server error during login', error: error.message });
    }
  });

  // Owner Logout
  router.post('/logout', (req, res) => {
    const ownerName = req.session?.owner?.ownerName || 'Unknown';
    req.session.destroy((err) => {
      if (err) {
        console.error('[OWNER_AUTH] Logout error for owner:', ownerName, err);
        return res.status(500).json({ message: 'Could not log out, please try again.' });
      }
      res.clearCookie('connect.sid'); // Ensure the session cookie is cleared
      console.log(`[OWNER_AUTH] Owner ${ownerName} logged out successfully.`);
      res.json({ message: 'Logout successful' });
    });
  });

  // Check Owner Authentication Status
  router.get('/status', (req, res) => {
    try {
      if (req.session && req.session.owner) {
        return res.json({
          isAuthenticated: true,
          owner: req.session.owner
        });
      }
      return res.json({ isAuthenticated: false, owner: null });
    } catch (error) {
      console.error('[OWNER_AUTH] Error in /status:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });

  // Check Library Code Availability
  router.get('/check-code/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const upperCaseCode = code.toUpperCase();
      const codeRegex = /^[A-Z0-9]{3,20}$/; // Use consistent regex

      if (!codeRegex.test(upperCaseCode)) {
        return res.status(400).json({ message: 'Library code must be 3-20 characters, letters and numbers only.' });
      }

      const result = await pool.query(
        'SELECT id FROM libraries WHERE library_code = $1',
        [upperCaseCode]
      );

      res.json({
        available: result.rows.length === 0,
        code: upperCaseCode
      });

    } catch (error) {
      console.error('[OWNER_AUTH] Error checking library code:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Forgot Password - Verify Email and Phone
  router.post('/forgot-password/verify', async (req, res) => {
    try {
      const { email, phone } = req.body;

      if (!email || !phone) {
        return res.status(400).json({ message: 'Email and phone number are required' });
      }

      // Check if email and phone match in database
      const result = await pool.query(
        'SELECT id, owner_name FROM libraries WHERE owner_email = $1 AND owner_phone = $2 AND status = $3',
        [email, phone, 'active']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No account found with the provided email and phone number' });
      }

      const library = result.rows[0];
      
      // Store verification in session temporarily (expires in 10 minutes)
      req.session.passwordReset = {
        libraryId: library.id,
        email: email,
        phone: phone,
        verified: true,
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
      };

      console.log(`[OWNER_AUTH] Password reset verification successful for library ID: ${library.id}`);

      res.json({
        message: 'Account verified successfully. You can now reset your password.',
        verified: true
      });

    } catch (error) {
      console.error('[OWNER_AUTH] Forgot password verification error:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      res.status(500).json({ message: 'Server error during verification', error: error.message });
    }
  });

  // Reset Password
  router.post('/forgot-password/reset', async (req, res) => {
    try {
      const { newPassword, confirmPassword } = req.body;

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation are required' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Check if verification session exists and is valid
      if (!req.session.passwordReset || !req.session.passwordReset.verified) {
        return res.status(401).json({ message: 'Password reset not verified. Please verify your email and phone first.' });
      }

      if (Date.now() > req.session.passwordReset.expiresAt) {
        delete req.session.passwordReset;
        return res.status(401).json({ message: 'Password reset verification expired. Please start over.' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password in database
      await pool.query(
        'UPDATE libraries SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, req.session.passwordReset.libraryId]
      );

      // Clear password reset session
      delete req.session.passwordReset;

      console.log(`[OWNER_AUTH] Password reset successful for library ID: ${req.session.passwordReset?.libraryId}`);

      res.json({
        message: 'Password reset successfully. You can now log in with your new password.'
      });

    } catch (error) {
      console.error('[OWNER_AUTH] Password reset error:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      res.status(500).json({ message: 'Server error during password reset', error: error.message });
    }
  });

  // Delete entire owner account (library) - OWNER ONLY
  // Permanently deletes the library and all related data (ON DELETE CASCADE)
  router.delete('/delete-account', authenticateOwner, async (req, res) => {
    try {
      const ownerId = req.session?.owner?.id;
      if (!ownerId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Accept snake_case or camelCase
      const { current_password, currentPassword, confirmation, confirmText } = req.body || {};
      const actualCurrentPassword = current_password || currentPassword;
      const actualConfirmation = confirmation || confirmText;

      if (!actualCurrentPassword || !actualConfirmation) {
        return res.status(400).json({ message: 'Current password and confirmation are required' });
      }

      // Fetch library code and password hash
      const libResult = await pool.query(
        'SELECT library_code, password FROM libraries WHERE id = $1',
        [ownerId]
      );

      if (libResult.rows.length === 0) {
        return res.status(404).json({ message: 'Library not found' });
      }

      const { library_code: libraryCode, password: passwordHash } = libResult.rows[0];

      if (actualConfirmation !== libraryCode) {
        return res.status(400).json({ message: 'Confirmation does not match your library code' });
      }

      const isPasswordValid = await bcrypt.compare(actualCurrentPassword, passwordHash || '');
      if (!isPasswordValid) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      // Hard delete the library; related rows removed via ON DELETE CASCADE
      await pool.query('DELETE FROM libraries WHERE id = $1', [ownerId]);

      // End session
      req.session.destroy(() => {});

      return res.json({ message: 'Account deleted successfully. All associated data has been removed.' });
    } catch (error) {
      console.error('[OWNER_AUTH] Error deleting owner account:', error);
      if (isDbAuthError(error)) {
        return handleDbAuthError(res, error);
      }
      return res.status(500).json({ message: 'Server error while deleting account', error: error.message });
    }
  });

  return router;
};

// Middleware to authenticate owner
const authenticateOwner = (req, res, next) => {
  if (req.session && req.session.owner && req.session.owner.id) {
    return next();
  }
  console.warn(
    "[OWNER_AUTH] Owner authentication failed for path:",
    req.path,
    "Session owner:", req.session.owner,
    "Session user:", req.session.user
  );
  return res
    .status(401)
    .json({ message: "Unauthorized - Please log in as a library owner" });
};

// Middleware to authenticate owner OR staff/admin users
const authenticateOwnerOrStaff = (req, res, next) => {
  // Check if owner is logged in
  if (req.session && req.session.owner && req.session.owner.id) {
    req.libraryId = req.session.owner.id;
    return next();
  }
  
  // Check if staff/admin user is logged in
  if (req.session && req.session.user && req.session.user.id) {
    // Staff and admin users should have access
    if (req.session.user.role === 'admin' || req.session.user.role === 'staff') {
      req.libraryId = req.session.user.libraryId;
      
      if (!req.libraryId) {
        console.warn("[OWNER_AUTH] Staff user authenticated but no libraryId found:", req.session.user);
        return res.status(401).json({ message: "Library ID not found in session" });
      }
      
      return next();
    }
  }
  
  console.warn(
    "[OWNER_AUTH] Owner/Staff authentication failed for path:",
    req.path,
    "Session owner:", req.session?.owner,
    "Session user:", req.session?.user
  );
  return res
    .status(401)
    .json({ message: "Unauthorized - Please log in as a library owner or staff member" });
};

// Middleware to ensure data isolation (owner can only access their own data)
const ensureOwnerDataIsolation = (req, res, next) => {
  if (!req.session || !req.session.owner) {
    return res.status(401).json({ message: 'Unauthorized - Please log in as library owner' });
  }
  req.libraryId = req.session.owner.id;
  next();
};

// Middleware to ensure data isolation for both owners and staff
const ensureDataIsolation = (req, res, next) => {
  // Owner session
  if (req.session && req.session.owner && req.session.owner.id) {
    req.libraryId = req.session.owner.id;
    return next();
  }
  
  // Staff/Admin user session
  if (req.session && req.session.user && req.session.user.id) {
    req.libraryId = req.session.user.libraryId;
    
    if (!req.libraryId) {
      console.warn("[OWNER_AUTH] Staff user in ensureDataIsolation but no libraryId found:", req.session.user);
      return res.status(401).json({ message: "Library ID not found in session" });
    }
    
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized - Please log in' });
};

module.exports = {
  createOwnerAuthRouter,
  authenticateOwner,
  authenticateOwnerOrStaff,
  ensureOwnerDataIsolation,
  ensureDataIsolation
};