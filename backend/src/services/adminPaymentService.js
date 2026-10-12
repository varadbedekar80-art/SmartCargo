const db = require('../config/db');

async function getAllPayments() {
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.invoice_id,
      p.amount,
      p.payment_reference,
      p.status,
      p.paid_at,
      p.created_at,
      i.invoice_number,
      i.status AS invoice_status,
      s.id AS shipment_id,
      s.origin,
      s.destination,
      u.name AS business_user_name,
      u.email AS business_user_email
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN shipments s ON s.id = i.shipment_id
     JOIN users u ON u.id = s.user_id
     ORDER BY p.created_at DESC`
  );

  return rows;
}

async function getPaymentById(paymentId) {
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.invoice_id,
      p.amount,
      p.payment_reference,
      p.status,
      p.paid_at,
      p.created_at,
      i.invoice_number,
      i.status AS invoice_status,
      s.id AS shipment_id,
      s.origin,
      s.destination,
      u.name AS business_user_name,
      u.email AS business_user_email
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN shipments s ON s.id = i.shipment_id
     JOIN users u ON u.id = s.user_id
     WHERE p.id = ?`,
    [paymentId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllPayments,
  getPaymentById,
};