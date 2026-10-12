const db = require('../config/db');

async function getPaymentsForBusinessUser(userId) {
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
      i.shipment_id
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN shipments s ON s.id = i.shipment_id
     WHERE s.user_id = ?
     ORDER BY p.created_at DESC`,
    [userId]
  );

  return rows;
}

async function getPaymentsForInvoice(userId, invoiceId) {
  const [rows] = await db.query(
    `SELECT
      p.id,
      p.invoice_id,
      p.amount,
      p.payment_reference,
      p.status,
      p.paid_at,
      p.created_at
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN shipments s ON s.id = i.shipment_id
     WHERE s.user_id = ?
       AND i.id = ?
     ORDER BY p.created_at DESC`,
    [userId, invoiceId]
  );

  return rows;
}

module.exports = {
  getPaymentsForBusinessUser,
  getPaymentsForInvoice,
};