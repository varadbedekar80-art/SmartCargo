
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
       p.verified_by,
       p.verified_at,
       p.rejection_reason,
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
       p.created_at,
       p.verified_by,
       p.verified_at,
       p.rejection_reason
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

    const [invoices] = await connection.query(
      `SELECT i.id, i.amount, i.status
       FROM invoices i
       JOIN shipments s ON s.id = i.shipment_id
       WHERE s.user_id = ? AND i.id = ?
       FOR UPDATE`,
      [userId, invoiceId]
    );

    if (!invoices.length) {
      const error = new Error(
        'Invoice not found or you do not have access to it.'
      );
      error.statusCode = 404;
      throw error;
    }

    const invoice = invoices[0];

    if (String(invoice.status).toLowerCase() === 'paid') {
      const error = new Error('This invoice is already paid.');
      error.statusCode = 409;
      throw error;
    }

    const [existing] = await connection.query(
      `SELECT id
       FROM payments
       WHERE payment_reference = ?
       LIMIT 1`,
      [paymentReference]
    );

    if (existing.length) {
      const error = new Error(
        'This transaction reference has already been submitted.'
      );
      error.statusCode = 409;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO payments (
         invoice_id,
         amount,
         payment_reference,
         status,
         paid_at
       )
       VALUES (?, ?, ?, 'pending_verification', NULL)`,
      [invoice.id, invoice.amount, paymentReference]
    );

    const [created] = await connection.query(
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
    return created[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getPendingPaymentsForProvider(providerUserId) {
  const [rows] = await db.query(
    `SELECT
       p.id AS payment_id,
       p.invoice_id,
       p.amount,
       p.payment_reference,
       p.status AS payment_status,
       p.created_at AS submitted_at,
       i.invoice_number,
       i.status AS invoice_status,
       s.id AS shipment_id,
       s.user_id AS customer_user_id,
       s.origin,
       s.destination,
       s.mode
     FROM payments p
     JOIN invoices i ON i.id = p.invoice_id
     JOIN shipments s ON s.id = i.shipment_id
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE pp.user_id = ?
       AND p.status = 'pending_verification'
     ORDER BY p.created_at ASC`,
    [providerUserId]
  );

  return rows;
}

async function reviewPaymentForProvider(
  providerUserId,
  paymentId,
  decision,
  rejectionReason = null
) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
         p.id AS payment_id,
         p.invoice_id,
         p.status AS payment_status,
         i.status AS invoice_status
       FROM payments p
       JOIN invoices i ON i.id = p.invoice_id
       JOIN shipments s ON s.id = i.shipment_id
       JOIN shipping_offers so ON so.id = s.offer_id
       JOIN provider_profiles pp ON pp.id = so.provider_id
       WHERE pp.user_id = ?
         AND p.id = ?
       FOR UPDATE`,
      [providerUserId, paymentId]
    );

    if (!rows.length) {
      const error = new Error(
        'Payment not found or not assigned to your shipments.'
      );
      error.statusCode = 404;
      throw error;
    }

    const payment = rows[0];

    if (payment.payment_status !== 'pending_verification') {
      const error = new Error(
        'This payment has already been reviewed.'
      );
      error.statusCode = 409;
      throw error;
    }

    if (decision === 'approve') {
      // The provider must independently confirm the actual bank/UPI receipt.
      await connection.query(
        `UPDATE payments
         SET status = 'paid',
             paid_at = CURRENT_TIMESTAMP,
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP,
             rejection_reason = NULL
         WHERE id = ?`,
        [providerUserId, paymentId]
      );

      await connection.query(
        `UPDATE invoices
         SET status = 'paid'
         WHERE id = ?`,
        [payment.invoice_id]
      );
    } else {
      await connection.query(
        `UPDATE payments
         SET status = 'rejected',
             verified_by = ?,
             verified_at = CURRENT_TIMESTAMP,
             rejection_reason = ?
         WHERE id = ?`,
        [providerUserId, rejectionReason, paymentId]
      );
    }

    await connection.commit();

    return {
      payment_id: Number(paymentId),
      invoice_id: payment.invoice_id,
      status: decision === 'approve' ? 'paid' : 'rejected',
    };
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
  getPendingPaymentsForProvider,
  reviewPaymentForProvider,
};
