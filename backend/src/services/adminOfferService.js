const db = require('../config/db');

async function getAllOffers() {
  const [rows] = await db.query(
    `SELECT
      so.id,
      so.provider_id,
      pp.company_name,
      u.name AS provider_name,
      u.email AS provider_email,
      so.offer_type,
      so.mode,
      so.origin,
      so.destination,
      so.coverage,
      so.rate_per_kg,
      so.max_weight_kg,
      so.available_space,
      so.status,
      so.created_at
     FROM shipping_offers so
     JOIN provider_profiles pp ON pp.id = so.provider_id
     JOIN users u ON u.id = pp.user_id
     ORDER BY so.created_at DESC`
  );

  return rows;
}

async function getOfferById(offerId) {
  const [rows] = await db.query(
    `SELECT
      so.id,
      so.provider_id,
      pp.company_name,
      u.name AS provider_name,
      u.email AS provider_email,
      so.offer_type,
      so.mode,
      so.origin,
      so.destination,
      so.coverage,
      so.rate_per_kg,
      so.max_weight_kg,
      so.available_space,
      so.status,
      so.created_at
     FROM shipping_offers so
     JOIN provider_profiles pp ON pp.id = so.provider_id
     JOIN users u ON u.id = pp.user_id
     WHERE so.id = ?`,
    [offerId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllOffers,
  getOfferById,
};