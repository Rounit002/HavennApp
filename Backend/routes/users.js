const { checkAdmin } = require('./auth');

module.exports = (pool) => {
  const router = require('express').Router();

  router.get('/profile', async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await pool.query(
        'SELECT id, username, full_name, email, role FROM users WHERE id = $1 AND library_id = $2',
        [req.session.user.id, req.libraryId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.put('/profile', async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { full_name, email, current_password, new_password } = req.body;

      if (email) {
        const emailCheck = await pool.query(
          'SELECT * FROM users WHERE email = $1 AND id != $2 AND library_id = $3',
          [email, req.session.user.id, req.libraryId]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ message: 'Email already in use by another user' });
        }
      }

      if (current_password && new_password) {
        const userResult = await pool.query('SELECT password FROM users WHERE id = $1 AND library_id = $2', [req.session.user.id, req.libraryId]);
        const isPasswordValid = (current_password === userResult.rows[0].password);

        if (!isPasswordValid) {
          return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const result = await pool.query(
          `UPDATE users SET 
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email),
           password = $3
           WHERE id = $4 AND library_id = $5 RETURNING id, username, full_name, email, role`,
          [full_name, email, new_password, req.session.user.id, req.libraryId]
        );

        return res.json({
          message: 'Profile updated successfully',
          user: result.rows[0]
        });
      } else {
        const result = await pool.query(
          `UPDATE users SET 
           full_name = COALESCE($1, full_name),
           email = COALESCE($2, email)
           WHERE id = $3 AND library_id = $4 RETURNING id, username, full_name, email, role`,
          [full_name, email, req.session.user.id, req.libraryId]
        );

        return res.json({
          message: 'Profile updated successfully',
          user: result.rows[0]
        });
      }
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.post('/', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const { username, password, role, full_name, email, permissions, branch_access } = req.body;

      if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required' });
      }
      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Must be "admin" or "staff"' });
      }

      // Validate branch access if provided
      if (branch_access && Array.isArray(branch_access) && branch_access.length > 0) {
        const branchIds = branch_access.map(id => parseInt(id)).filter(id => !isNaN(id));
        if (branchIds.length > 0) {
          const branchCheck = await client.query(
            'SELECT id FROM branches WHERE id = ANY($1) AND library_id = $2',
            [branchIds, req.libraryId]
          );
          if (branchCheck.rows.length !== branchIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'One or more invalid branch IDs provided' });
          }
        }
      }

      const existingUser = await client.query('SELECT * FROM users WHERE username = $1 AND library_id = $2', [username, req.libraryId]);
      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Username already exists' });
      }

      const result = await client.query(
        `INSERT INTO users (username, password, role, full_name, email, permissions, branch_access, library_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id, username, role, permissions, branch_access`,
        [username, password, role, full_name || '', email || '', permissions || [], branch_access || [], req.libraryId]
      );

      await client.query('COMMIT');
      
      console.log('[USERS] Created user with branch access:', {
        userId: result.rows[0].id,
        username: result.rows[0].username,
        permissions: result.rows[0].permissions,
        branch_access: result.rows[0].branch_access
      });

      res.status(201).json({
        message: 'User created successfully',
        user: result.rows[0]
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  router.get('/', checkAdmin, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT 
          u.id, 
          u.username, 
          u.role, 
          u.permissions, 
          u.branch_access,
          u.full_name,
          u.email,
          COALESCE(
            ARRAY_AGG(
              CASE WHEN b.id IS NOT NULL 
              THEN json_build_object('id', b.id, 'name', b.name) 
              END
            ) FILTER (WHERE b.id IS NOT NULL), 
            ARRAY[]::json[]
          ) as branch_details
        FROM users u
        LEFT JOIN LATERAL unnest(u.branch_access) AS ba(branch_id) ON true
        LEFT JOIN branches b ON b.id = ba.branch_id AND b.library_id = $1
        WHERE u.library_id = $1
        GROUP BY u.id, u.username, u.role, u.permissions, u.branch_access, u.full_name, u.email
        ORDER BY u.username`,
        [req.libraryId]
      );
      res.json(result.rows);
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  router.delete('/:id', checkAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const userToDelete = await pool.query('SELECT role FROM users WHERE id = $1 AND library_id = $2', [id, req.libraryId]);
      if (userToDelete.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (userToDelete.rows[0].role === 'admin') {
        const adminCount = await pool.query('SELECT COUNT(*) FROM users WHERE role = \'admin\' AND library_id = $1', [req.libraryId]);
        if (parseInt(adminCount.rows[0].count) <= 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin' });
        }
      }
      await pool.query('DELETE FROM users WHERE id = $1 AND library_id = $2', [id, req.libraryId]);
      res.json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

  // ✅ FIX: Update user permissions and invalidate their session to force re-login
  router.put('/:id/permissions', checkAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const userIdToUpdate = parseInt(req.params.id, 10);
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'Permissions must be an array of strings.' });
      }

      const result = await client.query(
        'UPDATE users SET permissions = $1 WHERE id = $2 AND library_id = $3 RETURNING id, username, role, permissions',
        [permissions, userIdToUpdate, req.libraryId]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found.' });
      }

      // If the admin is editing their own permissions, update their session
      if (req.session.user.id === userIdToUpdate) {
        req.session.user.permissions = permissions;
        console.log(`[users.js] Admin updated their own permissions in session:`, permissions);
      } else {
        // If an admin is editing another user, invalidate that user's sessions to force re-login
        console.log(`[users.js] Admin updating permissions for user ID ${userIdToUpdate}. Invalidating their sessions.`);
        // The "sess" column in connect-pg-simple stores session data as a JSON object.
        // We find all sessions where the sess->'user'->>'id' matches the user being updated and delete them.
        const deleteSessionQuery = `
          DELETE FROM session
          WHERE (sess->'user'->>'id')::integer = $1
        `;
        const deleteResult = await client.query(deleteSessionQuery, [userIdToUpdate]);
        if (deleteResult.rowCount > 0) {
          console.log(`[users.js] Invalidated ${deleteResult.rowCount} session(s) for user ID ${userIdToUpdate}.`);
        }
      }

      await client.query('COMMIT');
      res.json({
        message: 'User permissions updated successfully. The user may need to log in again to see changes.',
        user: result.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error updating user permissions:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    } finally {
      client.release();
    }
  });

  return router;
};