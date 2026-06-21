// utils/password.js
// Centralized password hashing/verification for staff & admin (users table).
// Owners already use bcrypt directly in ownerAuth.js / settings.js.
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// bcrypt hashes start with $2a$, $2b$ or $2y$
const isBcryptHash = (value) =>
  typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);

const hashPassword = async (plain) => bcrypt.hash(plain, SALT_ROUNDS);

/**
 * Verify a plaintext password against a stored value.
 * Supports lazy migration: if the stored value is still plaintext (legacy rows),
 * it falls back to a direct comparison and signals that the row should be re-hashed.
 *
 * @returns {Promise<{ valid: boolean, needsRehash: boolean }>}
 */
const verifyPassword = async (plain, stored) => {
  if (stored == null) return { valid: false, needsRehash: false };

  if (isBcryptHash(stored)) {
    const valid = await bcrypt.compare(plain, stored);
    return { valid, needsRehash: false };
  }

  // Legacy plaintext password (pre-migration).
  const valid = plain === stored;
  return { valid, needsRehash: valid };
};

module.exports = { hashPassword, verifyPassword, isBcryptHash, SALT_ROUNDS };
