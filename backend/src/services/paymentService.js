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

async function createPaymentReference(
  userId,
  invoiceId,
  paymentReference
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Verify invoice ownership and lock the invoice row.
    const [invoices] = await connection.query(
      `SELECT i.id, i.amount, i.status
       FROM invoices i
       JOIN shipments s ON s.id = i.shipment_id
       WHERE s.user_id = ? AND i.id = ?
       FOR UPDATE`,
      [userId, invoiceId]
    );

    if (invoices.length === 0) {
      const error = new Error(
        'Invoice not found or you do not have access to it.'
      );
      error.statusCode = 404;
      throw error;
    }

    const invoice = invoices[0];

    if (String(invoice.status || '').toLowerCase() === 'paid') {
      const error = new Error(
        'This invoice is already marked as paid.'
      );
      error.statusCode = 409;
      throw error;
    }

    // Prevent reusing an existing transaction reference.
    const [existing] = await connection.query(
      `SELECT id
       FROM payments
       WHERE payment_reference = ?
       LIMIT 1`,
      [paymentReference]
    );

    if (existing.length > 0) {
      const error = new Error(
        'This transaction reference has already been submitted.'
      );
      error.statusCode = 409;
      throw error;
    }

    // Amount comes from the invoice, not from the browser.
    const [result] = await connection.query(
      `INSERT INTO payments
        (invoice_id, amount, payment_reference, status, paid_at)
       VALUES (?, ?, ?, 'pending_verification', NULL)`,
      [invoice.id, invoice.amount, paymentReference]
    );

    const [createdRows] = await connection.query(
      `SELECT
        id,
        invoice_id,
        amount,
        payment_reference,
        status,
        paid_at,
        created_at
       FROM payments
       WHERE id = ?`,
      [result.insertId]
    );

    await connection.commit();

    return createdRows[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getPaymentsForBusinessUser,
  getPaymentsForInvoice,
  createPaymentReference,
};