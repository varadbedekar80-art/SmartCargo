
const db = require('../config/db');

async function getProviderShipments(providerUserId) {
  const [rows] = await db.query(
    `SELECT
      s.id,
      s.user_id,
      s.cargo_snapshot,
      s.origin,
      s.destination,
      s.mode,
      s.quoted_rate,
      s.estimated_price,
      s.confirmed_price,
      s.status,
      s.created_at,
      so.id AS offer_id
     FROM shipments s
     JOIN shipping_offers so ON so.id = s.offer_id
     JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE pp.user_id = ?
     ORDER BY s.created_at DESC`,
    [providerUserId]
  );

  return rows.map((shipment) => ({
    ...shipment,
    cargo_snapshot:
      typeof shipment.cargo_snapshot === 'string'
        ? JSON.parse(shipment.cargo_snapshot)
        : shipment.cargo_snapshot,
  }));
}

async function respondToShipment(providerUserId, shipmentId, decision) {
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [shipmentRows] = await connection.query(
      `SELECT
        s.id,
        s.user_id,
        s.status,
        s.cargo_snapshot,
        s.quoted_rate,
        so.id AS offer_id
       FROM shipments s
       JOIN shipping_offers so ON so.id = s.offer_id
       JOIN provider_profiles pp ON pp.id = so.provider_id
       WHERE s.id = ? AND pp.user_id = ?
       FOR UPDATE`,
      [shipmentId, providerUserId]
    );

    if (shipmentRows.length === 0) {
      throw new Error('SHIPMENT_NOT_FOUND');
    }

    const shipment = shipmentRows[0];

    if (shipment.status !== 'pending') {
      throw new Error('SHIPMENT_ALREADY_PROCESSED');
    }

    if (decision === 'reject') {
      await connection.query(
        `UPDATE shipments
         SET status = 'rejected'
         WHERE id = ? AND status = 'pending'`,
        [shipmentId]
      );

      await connection.query(
        `INSERT INTO notifications (
          user_id, shipment_id, title, message
        ) VALUES (?, ?, ?, ?)`,
        [
          shipment.user_id,
          shipmentId,
          'Shipment Request Rejected',
          `Your shipment request #${shipmentId} was rejected by the logistics provider.`,
        ]
      );

      await connection.commit();
      transactionStarted = false;

      return {
        id: shipmentId,
        status: 'rejected',
      };
    }

    const [offerRows] = await connection.query(
      `SELECT id, available_space, max_weight_kg, status
       FROM shipping_offers
       WHERE id = ?
       FOR UPDATE`,
      [shipment.offer_id]
    );

    if (offerRows.length === 0) {
      throw new Error('OFFER_NOT_FOUND');
    }

    const offer = offerRows[0];

    if (offer.status !== 'active') {
      throw new Error('OFFER_INACTIVE');
    }

    const cargoSnapshot =
      typeof shipment.cargo_snapshot === 'string'
        ? JSON.parse(shipment.cargo_snapshot)
        : shipment.cargo_snapshot;

    // Support both naming conventions for older and newer cargo snapshots.
    const weightKg = Number(
      cargoSnapshot?.weight_kg ?? cargoSnapshot?.weightKg
    );

    const quotedRate = Number(shipment.quoted_rate);

    if (
      !Number.isFinite(weightKg) ||
      weightKg <= 0 ||
      !Number.isFinite(quotedRate) ||
      quotedRate < 0
    ) {
      throw new Error('INVALID_CARGO_WEIGHT');
    }

    if (
      weightKg > Number(offer.available_space) ||
      weightKg > Number(offer.max_weight_kg)
    ) {
      throw new Error('INSUFFICIENT_CAPACITY');
    }

    const confirmedPrice = Number(
      (weightKg * quotedRate).toFixed(2)
    );

    const [capacityUpdate] = await connection.query(
      `UPDATE shipping_offers
       SET available_space = available_space - ?
       WHERE id = ?
         AND status = 'active'
         AND available_space >= ?
         AND max_weight_kg >= ?`,
      [weightKg, offer.id, weightKg, weightKg]
    );

    if (capacityUpdate.affectedRows !== 1) {
      throw new Error('INSUFFICIENT_CAPACITY');
    }

    const [shipmentUpdate] = await connection.query(
      `UPDATE shipments
       SET status = 'confirmed',
           confirmed_price = ?,
           confirmed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND status = 'pending'`,
      [confirmedPrice, shipmentId]
    );

    if (shipmentUpdate.affectedRows !== 1) {
      throw new Error('SHIPMENT_ALREADY_PROCESSED');
    }

    await connection.query(
      `INSERT INTO shipment_tracking (
        shipment_id, milestone, remarks, updated_by
      ) VALUES (?, ?, ?, ?)`,
      [
        shipmentId,
        'booking_confirmed',
        'Shipment request accepted by the logistics provider.',
        providerUserId,
      ]
    );

    const invoiceNumber = `SC-${shipmentId}-${Date.now()}`;

    await connection.query(
      `INSERT INTO invoices (
        shipment_id, invoice_number, amount, status
      ) VALUES (?, ?, ?, 'unpaid')`,
      [shipmentId, invoiceNumber, confirmedPrice]
    );

    await connection.query(
      `INSERT INTO notifications (
        user_id, shipment_id, title, message
      ) VALUES (?, ?, ?, ?)`,
      [
        shipment.user_id,
        shipmentId,
        'Shipment Confirmed',
        `Your shipment #${shipmentId} has been accepted. Confirmed price: ${confirmedPrice.toFixed(2)}.`,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      id: shipmentId,
      status: 'confirmed',
      confirmedPrice,
      invoiceNumber,
      invoiceStatus: 'unpaid',
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Shipment transaction rollback failed:',
          rollbackError.message
        );
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getProviderShipments,
  respondToShipment,
};

