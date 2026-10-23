const db = require('../config/db');

async function createOffer(providerUserId, {
  offerType,
  mode,
  origin,
  destination,
  coverage,
  ratePerKg,
  maxWeightKg,
  availableSpace,
  departureDate,
}) {
  const [profiles] = await db.query(
    'SELECT id FROM provider_profiles WHERE user_id = ?',
    [providerUserId]
  );

  if (profiles.length === 0) {
    throw new Error('PROVIDER_PROFILE_NOT_FOUND');
  }

  const providerProfileId = profiles[0].id;

  const [result] = await db.query(
    `INSERT INTO shipping_offers (
      provider_id,
      offer_type,
      mode,
      origin,
      destination,
      coverage,
      rate_per_kg,
      max_weight_kg,
      available_space,
      departure_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      providerProfileId,
      offerType,
      mode,
      origin || null,
      destination || null,
      coverage,
      ratePerKg,
      maxWeightKg,
      availableSpace ?? maxWeightKg,
      departureDate,
    ]
  );

  return getOfferById(result.insertId);
}

async function getOfferById(offerId) {
  const [rows] = await db.query(
    `SELECT
      so.id,
      so.provider_id,
      pp.company_name,
      so.offer_type,
      so.mode,
      so.origin,
      so.destination,
      so.coverage,
      so.rate_per_kg,
      so.max_weight_kg,
      so.available_space,
      so.departure_date,
      so.status,
      so.created_at
     FROM shipping_offers so
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE so.id = ?`,
    [offerId]
  );

  return rows[0] || null;
}

async function getOffersByProvider(providerUserId) {
  const [rows] = await db.query(
    `SELECT
      so.id,
      so.offer_type,
      so.mode,
      so.origin,
      so.destination,
      so.coverage,
      so.rate_per_kg,
      so.max_weight_kg,
      so.available_space,
      so.departure_date,
      so.status,
      so.created_at
     FROM shipping_offers so
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE pp.user_id = ?
     ORDER BY so.created_at DESC`,
    [providerUserId]
  );

  return rows;
}

async function getActiveOffers(departureDate = null) {
  let sql = `
    SELECT
      so.id,
      pp.company_name,
      so.offer_type,
      so.mode,
      so.origin,
      so.destination,
      so.coverage,
      so.rate_per_kg,
      so.max_weight_kg,
      so.available_space,
      so.departure_date,
      so.status
    FROM shipping_offers so
    JOIN provider_profiles pp ON pp.id = so.provider_id
    WHERE so.status = 'active'
      AND so.available_space > 0
  `;

  const params = [];

  if (departureDate) {
    sql += ' AND so.departure_date = ?';
    params.push(departureDate);
  }

  sql += ' ORDER BY so.departure_date ASC, so.created_at DESC';

  const [rows] = await db.query(sql, params);

  return rows;
}

async function updateOfferStatus(providerUserId, offerId, status) {
  const [result] = await db.query(
    `UPDATE shipping_offers so
     JOIN provider_profiles pp ON pp.id = so.provider_id
     SET so.status = ?
     WHERE so.id = ?
       AND pp.user_id = ?`,
    [status, offerId, providerUserId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  createOffer,
  getOfferById,
  getOffersByProvider,
  getActiveOffers,
  updateOfferStatus,
};
