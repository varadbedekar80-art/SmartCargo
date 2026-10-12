const db = require('../config/db');

async function createNotification(userId, title, message, shipmentId = null) {
  const [result] = await db.query(
    `INSERT INTO notifications (
      user_id,
      shipment_id,
      title,
      message
    ) VALUES (?, ?, ?, ?)`,
    [userId, shipmentId, title, message]
  );

  return result.insertId;
}

async function getNotificationsForUser(userId) {
  const [rows] = await db.query(
    `SELECT
      id,
      shipment_id,
      title,
      message,
      is_read,
      created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

async function markNotificationAsRead(userId, notificationId) {
  const [result] = await db.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead,
};