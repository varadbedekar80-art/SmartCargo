
const db = require('../config/db');

async function getAllInvoices() {
  const [rows] = await db.query(
    `SELECT
      i.id,
      i.invoice_number,
      i.amount,
      i.status,
      i.created_at,
      s.id AS shipment_id,
      s.origin,
      s.destination,
      s.mode,
      s.status AS shipment_status,
      u.id AS business_user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      COALESCE(
        SUM(
          CASE
            WHEN p.status = 'successful' THEN p.amount
            ELSE 0
          END
        ),
        0
      ) AS successful_payment_amount
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN payments p ON p.invoice_id = i.id
     GROUP BY
       i.id,
       i.invoice_number,
       i.amount,
       i.status,
       i.created_at,
       s.id,
       s.origin,
       s.destination,
       s.mode,
       s.status,
       u.id,
       u.name,
       u.email
     ORDER BY i.created_at DESC`
  );

  return rows;
}

async function getInvoiceById(invoiceId) {
  const [rows] = await db.query(
    `SELECT
      i.id,
      i.invoice_number,
      i.amount,
      i.status,
      i.created_at,
      s.id AS shipment_id,
      s.origin,
      s.destination,
      s.mode,
      s.status AS shipment_status,
      u.id AS business_user_id,
      u.name AS business_user_name,
      u.email AS business_user_email,
      COALESCE(
        SUM(
          CASE
            WHEN p.status = 'successful' THEN p.amount
            ELSE 0
          END
        ),
        0
      ) AS successful_payment_amount
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     JOIN users u ON u.id = s.user_id
     LEFT JOIN payments p ON p.invoice_id = i.id
     WHERE i.id = ?
     GROUP BY
       i.id,
       i.invoice_number,
       i.amount,
       i.status,
       i.created_at,
       s.id,
       s.origin,
       s.destination,
       s.mode,
       s.status,
       u.id,
       u.name,
       u.email`,
    [invoiceId]
  );

  return rows[0] || null;
}

module.exports = {
  getAllInvoices,
  getInvoiceById,
};
