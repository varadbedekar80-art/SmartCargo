
const db = require('../config/db');

function formatProfile(row) {
  if (!row) return null;

  let transportModes = [];

  try {
    transportModes = row.transport_modes
      ? JSON.parse(row.transport_modes)
      : [];
  } catch {
    transportModes = [];
  }

  return {
    id: row.id,
    userId: row.user_id,
    companyName: row.company_name || '',
    contactName: row.contact_name || '',
    email: row.email || '',
    phone: row.phone || '',
    registrationNumber: row.registration_number || '',
    address: row.address || '',
    transportModes: Array.isArray(transportModes)
      ? transportModes
      : [],
    serviceRegions: row.service_regions || '',
    description: row.description || '',
  };
}

async function getProviderProfile(userId) {
  const [rows] = await db.execute(
    `SELECT
       id,
       user_id,
       company_name,
       contact_name,
       email,
       phone,
       registration_number,
       address,
       transport_modes,
       service_regions,
       description
     FROM provider_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return formatProfile(rows[0] || null);
}

async function saveProviderProfile(userId, profile) {
  const {
    companyName,
    contactName,
    email,
    phone,
    registrationNumber,
    address,
    transportModes,
    serviceRegions,
    description,
  } = profile;

  await db.execute(
    `INSERT INTO provider_profiles (
       user_id,
       company_name,
       contact_name,
       email,
       phone,
       registration_number,
       address,
       transport_modes,
       service_regions,
       description
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       company_name = VALUES(company_name),
       contact_name = VALUES(contact_name),
       email = VALUES(email),
       phone = VALUES(phone),
       registration_number = VALUES(registration_number),
       address = VALUES(address),
       transport_modes = VALUES(transport_modes),
       service_regions = VALUES(service_regions),
       description = VALUES(description)`,
    [
      userId,
      companyName,
      contactName || null,
      email || null,
      phone || null,
      registrationNumber || null,
      address || null,
      JSON.stringify(transportModes || []),
      serviceRegions || null,
      description || null,
    ]
  );

  return getProviderProfile(userId);
}

module.exports = {
  getProviderProfile,
  saveProviderProfile,
};
