const db = require('../config/db');

async function getAllShipments() {
  const [rows] = await db.query(
    `SELECT
      s.id,
      s.user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      s.offer_id,
      pp.company_name AS provider_company,
      s.cargo_snapshot,
      s.origin,
      s.destination,
      s.mode,
      s.quoted_rate,
      s.estimated_price,
      s.confirmed_price,
      s.status,
      s.created_at,
      s.confirmed_at
     FROM shipments s
     JOIN users u ON u.id = s.user_id
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     ORDER BY s.created_at DESC`
  );

  return rows;
}

async function getShipmentById(shipmentId) {
  const [rows] = await db.query(
    `SELECT
      s.id,
      s.user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      s.offer_id,
      pp.company_name AS provider_company,
      s.cargo_snapshot,
      s.origin,
      s.destination,
      s.mode,
      s.quoted_rate,
      s.estimated_price,
      s.confirmed_price,
      s.status,
      s.created_at,
      s.confirmed_at
     FROM shipments s
     JOIN users u ON u.id = s.user_id
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE s.id = ?`,
    [shipmentId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllShipments,
  getShipmentById,
};