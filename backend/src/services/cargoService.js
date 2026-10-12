
const db = require('../config/db');

async function createCargo(userId, { name, description, weightKg, quantity }) {
  const [result] = await db.query(
    `INSERT INTO cargo (user_id, name, description, weight_kg, quantity)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, name.trim(), description || null, weightKg, quantity]
  );

  return getCargoById(userId, result.insertId);
}

async function getCargoById(userId, cargoId) {
  const [rows] = await db.query(
    `SELECT id, name, description, weight_kg, quantity, created_at
     FROM cargo
     WHERE id = ? AND user_id = ?`,
    [cargoId, userId]
  );

  return rows[0] || null;
}

async function getCargoByUser(userId) {
  const [rows] = await db.query(
    `SELECT id, name, description, weight_kg, quantity, created_at
     FROM cargo
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

async function updateCargo(userId, cargoId, {
  name,
  description,
  weightKg,
  quantity,
}) {
  const [result] = await db.query(
    `UPDATE cargo
     SET name = ?, description = ?, weight_kg = ?, quantity = ?
     WHERE id = ?
       AND user_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM shipments WHERE cargo_id = ?
       )`,
    [
      name.trim(),
      description || null,
      weightKg,
      quantity,
      cargoId,
      userId,
      cargoId,
    ]
  );

  if (result.affectedRows === 0) {
    return { updated: false };
  }

  return {
    updated: true,
    cargo: await getCargoById(userId, cargoId),
  };
}

async function deleteCargo(userId, cargoId) {
  const [result] = await db.query(
    `DELETE FROM cargo
     WHERE id = ?
       AND user_id = ?
       AND NOT EXISTS (
         SELECT 1 FROM shipments WHERE cargo_id = ?
       )`,
    [cargoId, userId, cargoId]
  );

  return result.affectedRows > 0;
}


module.exports = {
  createCargo,
  getCargoById,
  getCargoByUser,
  updateCargo,
  deleteCargo,
};