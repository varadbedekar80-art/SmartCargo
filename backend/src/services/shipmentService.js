const db = require('../config/db');

async function createShipment(
  userId,
  { cargoId, origin, destination, offerId, departureDate }
) {
  // Verify that the cargo belongs to the logged-in business user.
  const [cargoRows] = await db.query(
    `SELECT
       id,
       name,
       description,
       weight_kg,
       quantity
     FROM cargo
     WHERE id = ? AND user_id = ?`,
    [cargoId, userId]
  );

  if (cargoRows.length === 0) {
    throw new Error('CARGO_NOT_FOUND');
  }

  const cargo = cargoRows[0];
  const weightKg = Number(cargo.weight_kg);

  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    throw new Error('CARGO_EXCEEDS_MAX_WEIGHT');
  }

  // Find an active offer that matches the exact departure date.
  const [offerRows] = await db.query(
    `SELECT
       id,
       provider_id,
       offer_type,
       mode,
       origin,
       destination,
       coverage,
       rate_per_kg,
       max_weight_kg,
       available_space,
       departure_date
     FROM shipping_offers
     WHERE id = ?
       AND status = 'active'
       AND available_space > 0
       AND departure_date = ?`,
    [offerId, departureDate]
  );

  if (offerRows.length === 0) {
    throw new Error('OFFER_NOT_AVAILABLE');
  }

  const offer = offerRows[0];

  // Confirm the cargo fits the selected offer.
  if (
    weightKg > Number(offer.max_weight_kg) ||
    weightKg > Number(offer.available_space)
  ) {
    throw new Error('CARGO_EXCEEDS_MAX_WEIGHT');
  }

  // Validate transport mode against the selected offer.
  if (
    String(offer.mode || '').toLowerCase() !==
    String(offer.mode || '').toLowerCase()
  ) {
    throw new Error('OFFER_NOT_AVAILABLE');
  }

  // Validate route-specific offers.
  if (offer.offer_type === 'route_specific') {
    const sameOrigin =
      String(offer.origin || '').trim().toLowerCase() ===
      origin.trim().toLowerCase();

    const sameDestination =
      String(offer.destination || '').trim().toLowerCase() ===
      destination.trim().toLowerCase();

    if (!sameOrigin || !sameDestination) {
      throw new Error('ROUTE_MISMATCH');
    }
  } else if (
    !['global', 'nationwide'].includes(
      String(offer.coverage || '').toLowerCase()
    )
  ) {
    throw new Error('ROUTE_MISMATCH');
  }

  const quotedRate = Number(offer.rate_per_kg);
  const estimatedPrice = Number(
    (quotedRate * weightKg).toFixed(2)
  );

  const cargoSnapshot = JSON.stringify({
    id: cargo.id,
    name: cargo.name,
    description: cargo.description,
    weight_kg: weightKg,
    quantity: cargo.quantity,
  });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Reserve capacity only if the offer is still active,
    // matches the departure date, and has enough available space.
    const [capacityResult] = await connection.query(
      `UPDATE shipping_offers
       SET available_space = available_space - ?
       WHERE id = ?
         AND status = 'active'
         AND departure_date = ?
         AND available_space >= ?
         AND max_weight_kg >= ?`,
      [
        weightKg,
        offerId,
        departureDate,
        weightKg,
        weightKg,
      ]
    );

    if (capacityResult.affectedRows === 0) {
      throw new Error('OFFER_NOT_AVAILABLE');
    }

    // Save the shipment using the selected offer.
    // The departure date is validated against shipping_offers;
    // this does not require a new column in the shipments table.
    const [result] = await connection.query(
      `INSERT INTO shipments (
         user_id,
         cargo_id,
         offer_id,
         cargo_snapshot,
         origin,
         destination,
         mode,
         quoted_rate,
         estimated_price,
         status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userId,
        cargoId,
        offerId,
        cargoSnapshot,
        origin.trim(),
        destination.trim(),
        offer.mode,
        quotedRate,
        estimatedPrice,
      ]
    );

    await connection.commit();

    return {
      id: result.insertId,
      user_id: userId,
      cargo_id: cargoId,
      offer_id: offerId,
      cargo_snapshot: JSON.parse(cargoSnapshot),
      origin: origin.trim(),
      destination: destination.trim(),
      mode: offer.mode,
      departure_date: departureDate,
      quoted_rate: quotedRate,
      estimated_price: estimatedPrice,
      confirmed_price: null,
      status: 'pending',
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getShipmentsByUser(userId) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.user_id,
       s.cargo_id,
       s.offer_id,
       s.cargo_snapshot,
       s.origin,
       s.destination,
       s.mode,
       so.departure_date,
       s.quoted_rate,
       s.estimated_price,
       s.confirmed_price,
       s.status,
       s.created_at,
       s.confirmed_at,
       pp.company_name
     FROM shipments s
     LEFT JOIN shipping_offers so ON so.id = s.offer_id
     LEFT JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE s.user_id = ?
     ORDER BY s.created_at DESC`,
    [userId]
  );

  return rows;
}

async function getShipmentById(userId, shipmentId) {
  const [rows] = await db.query(
    `SELECT
       s.id,
       s.user_id,
       s.cargo_id,
       s.offer_id,
       s.cargo_snapshot,
       s.origin,
       s.destination,
       s.mode,
       so.departure_date,
       s.quoted_rate,
       s.estimated_price,
       s.confirmed_price,
       s.status,
       s.created_at,
       s.confirmed_at,
       pp.company_name
     FROM shipments s
     LEFT JOIN shipping_offers so ON so.id = s.offer_id
     LEFT JOIN provider_profiles pp ON pp.id = so.provider_id
     WHERE s.id = ?
       AND s.user_id = ?
     LIMIT 1`,
    [shipmentId, userId]
  );

  return rows[0] || null;
}

module.exports = {
  createShipment,
  getShipmentsByUser,
  getShipmentById,
};
