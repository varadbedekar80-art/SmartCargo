
const db = require('../config/db');

async function getTrackingHistoryForShipment(shipmentId) {
  // First, verify that the shipment exists.
  const [shipments] = await db.query(
    'SELECT id FROM shipments WHERE id = ?',
    [shipmentId]
  );

  if (shipments.length === 0) {
    return null;
  }

  // Retrieve tracking history for the existing shipment.
  const [rows] = await db.query(
    `SELECT
      st.id,
      st.shipment_id,
      st.milestone,
      st.remarks,
      st.updated_by,
      u.name AS updated_by_name,
      u.role AS updated_by_role,
      st.created_at
     FROM shipment_tracking st
     JOIN users u ON u.id = st.updated_by
     WHERE st.shipment_id = ?
     ORDER BY st.created_at ASC, st.id ASC`,
    [shipmentId]
  );

  return rows;
}

module.exports = {
  getTrackingHistoryForShipment,
};
