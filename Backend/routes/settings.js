const { checkAdmin } = require('./auth');
const { authenticateOwnerOrStaff } = require('./ownerAuth');
const bcrypt = require('bcrypt');

module.exports = (pool) => {
  const router = require('express').Router();

  router.get('/', checkAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM settings');
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });
      res.json(settings);
    } catch (err) {
      console.error('Error in settings GET route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/', checkAdmin, async (req, res) => {
    try {
      const { brevo_template_id, days_before_expiration } = req.body;
      if (brevo_template_id && typeof brevo_template_id !== 'string') {
        return res.status(400).json({ message: 'Invalid Brevo template ID' });
      }
      if (days_before_expiration && (isNaN(days_before_expiration) || days_before_expiration < 1)) {
        return res.status(400).json({ message: 'Days before expiration must be a positive integer' });
      }
      if (brevo_template_id) {
        await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['brevo_template_id', brevo_template_id]);
      }
      if (days_before_expiration) {
        await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', ['days_before_expiration', days_before_expiration.toString()]);
      }
      res.json({ message: 'Settings updated successfully' });
    } catch (err) {
      console.error('Error in settings PUT route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // --- Owner-Specific Routes ---

  // Get owner profile
  router.get('/owner/profile', authenticateOwnerOrStaff, async (req, res) => {
    try {
      const ownerId = req.libraryId;
      const result = await pool.query('SELECT id, library_code, library_name, owner_name, owner_email, owner_phone FROM libraries WHERE id = $1', [ownerId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Owner not found' });
      }

      res.json({ owner: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Update owner profile
  router.put('/owner/profile', authenticateOwnerOrStaff, async (req, res) => {
    try {
      const ownerId = req.libraryId;
      const { library_name, owner_name, owner_email, owner_phone } = req.body;

      const result = await pool.query(
        'UPDATE libraries SET library_name = $1, owner_name = $2, owner_email = $3, owner_phone = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, library_name, owner_name, owner_email, owner_phone',
        [library_name, owner_name, owner_email, owner_phone, ownerId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Owner not found' });
      }

      res.json({ message: 'Profile updated successfully', owner: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // Change owner password
  router.put('/owner/password', authenticateOwnerOrStaff, async (req, res) => {
    try {
      console.log('[SETTINGS] Password change request received');
      console.log('[SETTINGS] Request body:', JSON.stringify(req.body, null, 2));
      console.log('[SETTINGS] Request headers:', JSON.stringify(req.headers, null, 2));
      console.log('[SETTINGS] Content-Type:', req.headers['content-type']);
      
      const ownerId = req.libraryId;
      // Extract the correct field names that frontend is sending (snake_case)
      const { current_password, new_password, currentPassword, newPassword } = req.body;
      
      // Use snake_case fields if available, fallback to camelCase for compatibility
      const actualCurrentPassword = current_password || currentPassword;
      const actualNewPassword = new_password || newPassword;
      
      console.log('[SETTINGS] Extracted current_password:', current_password);
      console.log('[SETTINGS] Extracted new_password:', new_password);
      console.log('[SETTINGS] Extracted currentPassword:', currentPassword);
      console.log('[SETTINGS] Extracted newPassword:', newPassword);
      console.log('[SETTINGS] Using actualCurrentPassword:', actualCurrentPassword);
      console.log('[SETTINGS] Using actualNewPassword:', actualNewPassword);

      // Input validation
      if (!actualCurrentPassword || !actualNewPassword) {
        console.log('[SETTINGS] Missing password fields');
        return res.status(400).json({ message: 'Current password and new password are required' });
      }

      if (typeof actualCurrentPassword !== 'string' || typeof actualNewPassword !== 'string') {
        console.log('[SETTINGS] Password fields must be strings');
        return res.status(400).json({ message: 'Password fields must be valid strings' });
      }

      if (actualCurrentPassword.trim() === '' || actualNewPassword.trim() === '') {
        console.log('[SETTINGS] Password fields cannot be empty');
        return res.status(400).json({ message: 'Password fields cannot be empty' });
      }

      if (actualNewPassword.length < 6) {
        console.log('[SETTINGS] New password too short');
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      if (!ownerId) {
        console.log('[SETTINGS] No owner ID in session');
        return res.status(401).json({ message: 'Authentication required' });
      }

      console.log('[SETTINGS] Fetching owner data for ID:', ownerId);
      const result = await pool.query('SELECT password FROM libraries WHERE id = $1', [ownerId]);
      
      if (result.rows.length === 0) {
        console.log('[SETTINGS] Owner not found in database');
        return res.status(404).json({ message: 'Owner not found' });
      }

      const owner = result.rows[0];

      // Defensive check: Ensure password hash exists before comparing
      if (!owner.password) {
        console.log('[SETTINGS] No password hash found for owner');
        return res.status(500).json({ message: 'Cannot change password. No password is set for this account.' });
      }

      if (typeof owner.password !== 'string' || owner.password.trim() === '') {
        console.log('[SETTINGS] Invalid password hash format in database');
        return res.status(500).json({ message: 'Invalid password data. Please contact support.' });
      }

      console.log('[SETTINGS] Comparing current password');
      console.log('[SETTINGS] Current password length:', actualCurrentPassword.length);
      console.log('[SETTINGS] Stored hash length:', owner.password.length);
      
      let isMatch;
      try {
        isMatch = await bcrypt.compare(actualCurrentPassword, owner.password);
      } catch (bcryptError) {
        console.error('[SETTINGS] Bcrypt comparison error:', bcryptError.message);
        return res.status(500).json({ message: 'Password verification failed. Please try again.' });
      }

      if (!isMatch) {
        console.log('[SETTINGS] Current password does not match');
        return res.status(400).json({ message: 'Incorrect current password' });
      }

      console.log('[SETTINGS] Hashing new password');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(actualNewPassword, salt);

      console.log('[SETTINGS] Updating password in database');
      await pool.query('UPDATE libraries SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [hashedPassword, ownerId]);

      console.log('[SETTINGS] Password changed successfully for owner:', ownerId);
      res.json({ message: 'Password changed successfully' });
    } catch (err) {
      console.error('[SETTINGS] Error in password change route:', err.stack);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  return router;
};