const db = require('../config/db');

async function getShipmentReport() {
  const [rows] = await db.query(`
    SELECT
      mode,
      COUNT(*) AS total_shipments,
      SUM(status = 'pending') AS pending_shipments,
      SUM(status = 'confirmed') AS confirmed_shipments,
      SUM(status = 'rejected') AS rejected_shipments,
      SUM(status = 'delivered') AS delivered_shipments
    FROM shipments
    GROUP BY mode
    ORDER BY mode
  `);

  return rows;
}

async function getMonthlyShipmentReport() {
  const [rows] = await db.query(`
    SELECT
      DATE_FORMAT(created_at, '%Y-%m') AS month,
      COUNT(*) AS total_shipments
    FROM shipments
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month DESC
    LIMIT 12
  `);

  return rows;
}

module.exports = {
  getShipmentReport,
  getMonthlyShipmentReport,
};