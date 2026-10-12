const db = require('../config/db');

async function getAllCargo() {
  const [rows] = await db.query(
    `SELECT
      c.id,
      c.user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      c.name AS cargo_name,
      c.description,
      c.weight_kg,
      c.quantity,
      c.created_at
     FROM cargo c
     JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC`
  );

  return rows;
}

async function getCargoById(cargoId) {
  const [rows] = await db.query(
    `SELECT
      c.id,
      c.user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      c.name AS cargo_name,
      c.description,
      c.weight_kg,
      c.quantity,
      c.created_at
     FROM cargo c
     JOIN users u ON u.id = c.user_id
     WHERE c.id = ?`,
    [cargoId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllCargo,
  getCargoById,
};