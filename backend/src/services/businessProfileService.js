
const db = require('../config/db');

async function getBusinessProfile(userId) {
  const [rows] = await db.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       bp.company_name,
       bp.phone,
       bp.business_type,
       bp.country,
       bp.address,
       bp.website,
       bp.description
     FROM users u
     LEFT JOIN business_profiles bp ON bp.user_id = u.id
     WHERE u.id = ? AND u.role = 'business_user'
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const row = rows[0];

  return {
    id: row.id,
    fullName: row.name || '',
    email: row.email || '',
    company: row.company_name || '',
    phone: row.phone || '',
    businessType: row.business_type || 'Exporter',
    registrationNumber: '',
    country: row.country || 'India',
    address: row.address || '',
    city: '',
    website: row.website || '',
    description: row.description || '',
  };
}

async function updateBusinessProfile(userId, profile) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query(
      `SELECT id
       FROM users
       WHERE id = ? AND role = 'business_user'
       LIMIT 1`,
      [userId]
    );

    if (!users.length) {
      throw new Error('PROFILE_NOT_FOUND');
    }

    await connection.query(
      `UPDATE users
       SET name = ?, email = ?
       WHERE id = ?`,
      [
        profile.fullName.trim(),
        profile.email.trim().toLowerCase(),
        userId,
      ]
    );

    await connection.query(
      `INSERT INTO business_profiles (
         user_id,
         company_name,
         phone,
         business_type,
         country,
         address,
         website,
         description
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         company_name = VALUES(company_name),
         phone = VALUES(phone),
         business_type = VALUES(business_type),
         country = VALUES(country),
         address = VALUES(address),
         website = VALUES(website),
         description = VALUES(description)`,
      [
        userId,
        profile.company.trim(),
        profile.phone?.trim() || null,
        profile.businessType?.trim() || 'Exporter',
        profile.country?.trim() || 'India',
        profile.address?.trim() || null,
        profile.website?.trim() || null,
        profile.description?.trim() || null,
      ]
    );

    await connection.commit();

    return getBusinessProfile(userId);
  } catch (error) {
    await connection.rollback();

    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('EMAIL_EXISTS');
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
};
