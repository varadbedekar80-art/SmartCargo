const db = require('../config/db');

async function getAllUsers() {
  const [rows] = await db.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      pp.company_name,
      pp.phone
     FROM users u
     LEFT JOIN provider_profiles pp ON pp.user_id = u.id
     ORDER BY u.created_at DESC`
  );

  return rows;
}

async function getUserById(userId) {
  const [rows] = await db.query(
    `SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.created_at,
      pp.company_name,
      pp.phone,
      pp.address
     FROM users u
     LEFT JOIN provider_profiles pp ON pp.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllUsers,
  getUserById,
};