
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function registerUser({
  name,
  email,
  password,
  role,
  companyName,
  phone,
  address,
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  // Check for an existing account before creating a password hash.
  const [existingUsers] = await db.query(
    'SELECT id FROM users WHERE email = ?',
    [normalizedEmail]
  );

  if (existingUsers.length > 0) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const connection = await db.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [userResult] = await connection.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [cleanName, normalizedEmail, passwordHash, role]
    );

    if (role === 'provider') {
      await connection.query(
        `INSERT INTO provider_profiles
         (user_id, company_name, phone, address)
         VALUES (?, ?, ?, ?)`,
        [
          userResult.insertId,
          companyName.trim(),
          phone || null,
          address || null,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    // Create the token after the database transaction succeeds.
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET_NOT_CONFIGURED');
    }

    const token = jwt.sign(
      {
        id: userResult.insertId,
        role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d',
      }
    );

    return {
      token,
      user: {
        id: userResult.insertId,
        name: cleanName,
        email: normalizedEmail,
        role,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Registration rollback failed:',
          rollbackError.message
        );
      }
    }

    // The database unique constraint handles simultaneous registrations.
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('EMAIL_EXISTS');
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function loginUser({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();

  const [users] = await db.query(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE email = ?`,
    [normalizedEmail]
  );

  if (users.length === 0) {
    throw new Error('INVALID_CREDENTIALS');
  }

  const user = users[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET_NOT_CONFIGURED');
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

module.exports = {
  registerUser,
  loginUser,
};