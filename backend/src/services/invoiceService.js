
const db = require('../config/db');

async function createInvoiceForShipment(shipmentId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [shipments] = await connection.query(
      `SELECT id, status, confirmed_price
       FROM shipments
       WHERE id = ?
       FOR UPDATE`,
      [shipmentId]
    );

    if (shipments.length === 0) {
      throw new Error('SHIPMENT_NOT_FOUND');
    }

    const shipment = shipments[0];

    if (
      !['confirmed', 'picked_up', 'in_transit', 'delivered'].includes(
        shipment.status
      )
    ) {
      throw new Error('SHIPMENT_NOT_CONFIRMED');
    }

    if (shipment.confirmed_price === null) {
      throw new Error('CONFIRMED_PRICE_MISSING');
    }

    const [existingInvoices] = await connection.query(
      `SELECT id, invoice_number, amount, status, created_at
       FROM invoices
       WHERE shipment_id = ?`,
      [shipmentId]
    );

    if (existingInvoices.length > 0) {
      await connection.commit();
      return existingInvoices[0];
    }

    const invoiceNumber = `SC-${shipmentId}-${Date.now()}`;

    const [result] = await connection.query(
      `INSERT INTO invoices (
        shipment_id,
        invoice_number,
        amount,
        status
      ) VALUES (?, ?, ?, 'unpaid')`,
      [
        shipmentId,
        invoiceNumber,
        shipment.confirmed_price,
      ]
    );

    const [invoices] = await connection.query(
      `SELECT id, invoice_number, amount, status, created_at
       FROM invoices
       WHERE id = ?`,
      [result.insertId]
    );

    await connection.commit();

    return invoices[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getInvoicesForBusinessUser(userId) {
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
      s.mode
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     WHERE s.user_id = ?
     ORDER BY i.created_at DESC`,
    [userId]
  );

  return rows;
}

async function getInvoiceForBusinessUser(userId, invoiceId) {
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
      s.mode
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     WHERE i.id = ? AND s.user_id = ?`,
    [invoiceId, userId]
  );

  return rows[0] || null;
}

async function getInvoicesForProvider(providerUserId) {
  const [rows] = await db.query(
    `SELECT
      i.id,
      i.invoice_number,
      i.amount,
      i.status,
      i.created_at,
      s.id AS shipment_id,
      s.user_id AS customer_user_id,
      s.origin,
      s.destination,
      s.mode,
      s.status AS shipment_status
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE pp.user_id = ?
     ORDER BY i.created_at DESC`,
    [providerUserId]
  );

  return rows;
}

async function getInvoiceForProvider(providerUserId, invoiceId) {
  const [rows] = await db.query(
    `SELECT
      i.id,
      i.invoice_number,
      i.amount,
      i.status,
      i.created_at,
      s.id AS shipment_id,
      s.user_id AS customer_user_id,
      s.origin,
      s.destination,
      s.mode,
      s.status AS shipment_status
     FROM invoices i
     JOIN shipments s ON s.id = i.shipment_id
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE pp.user_id = ?
       AND i.id = ?
     LIMIT 1`,
    [providerUserId, invoiceId]
  );

  return rows[0] || null;
}

module.exports = {
  createInvoiceForShipment,
  getInvoicesForBusinessUser,
  getInvoiceForBusinessUser,
  getInvoicesForProvider,
  getInvoiceForProvider,
};
