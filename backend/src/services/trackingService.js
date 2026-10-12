
const db = require('../config/db');

const trackingMilestones = {
  air: [
    'booking_confirmed',
    'cargo_picked_up',
    'departed',
    'in_transit',
    'arrived',
    'customs_clearance',
    'out_for_delivery',
    'delivered',
  ],
  sea: [
    'booking_confirmed',
    'cargo_picked_up',
    'loaded_on_vessel',
    'vessel_departed',
    'in_transit',
    'arrived_at_port',
    'customs_clearance',
    'out_for_delivery',
    'delivered',
  ],
  road: [
    'booking_confirmed',
    'cargo_picked_up',
    'in_transit',
    'arrived_at_destination',
    'out_for_delivery',
    'delivered',
  ],
};

async function addTrackingUpdate(providerUserId, shipmentId, {
  milestone,
  remarks,
}) {
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the shipment and verify provider ownership.
    const [rows] = await connection.query(
      `SELECT
        s.id,
        s.user_id,
        s.status,
        s.mode
       FROM shipments s
       JOIN shipping_offers so ON so.id = s.offer_id
       JOIN provider_profiles pp ON pp.id = so.provider_id
       WHERE s.id = ? AND pp.user_id = ?
       FOR UPDATE`,
      [shipmentId, providerUserId]
    );

    if (rows.length === 0) {
      throw new Error('SHIPMENT_NOT_FOUND');
    }

    const shipment = rows[0];

    if (
      !['confirmed', 'picked_up', 'in_transit'].includes(shipment.status)
    ) {
      throw new Error('SHIPMENT_NOT_TRACKABLE');
    }

    const allowedMilestones = trackingMilestones[shipment.mode];

    if (!allowedMilestones || !allowedMilestones.includes(milestone)) {
      throw new Error('INVALID_MILESTONE');
    }

    // Read the latest tracking event.
    const [previousUpdates] = await connection.query(
      `SELECT milestone
       FROM shipment_tracking
       WHERE shipment_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [shipmentId]
    );

    const previousMilestone = previousUpdates[0]?.milestone;
    const previousIndex = previousMilestone
      ? allowedMilestones.indexOf(previousMilestone)
      : -1;
    const newIndex = allowedMilestones.indexOf(milestone);

    // If booking confirmation is missing, require it first.
    if (previousIndex === -1 && newIndex !== 0) {
      throw new Error('MILESTONE_OUT_OF_ORDER');
    }

    // Require exactly the next milestone; block duplicates and skips.
    if (previousIndex >= 0 && newIndex !== previousIndex + 1) {
      throw new Error(
        newIndex === previousIndex
          ? 'MILESTONE_ALREADY_RECORDED'
          : 'MILESTONE_OUT_OF_ORDER'
      );
    }

    // Record the milestone.
    await connection.query(
      `INSERT INTO shipment_tracking (
        shipment_id, milestone, remarks, updated_by
      ) VALUES (?, ?, ?, ?)`,
      [shipmentId, milestone, remarks || null, providerUserId]
    );

    // Update the shipment's overall status where appropriate.
    let shipmentStatus = shipment.status;

    if (milestone === 'cargo_picked_up') {
      shipmentStatus = 'picked_up';
    } else if (milestone === 'in_transit') {
      shipmentStatus = 'in_transit';
    } else if (milestone === 'delivered') {
      shipmentStatus = 'delivered';
    }

    if (shipmentStatus !== shipment.status) {
      await connection.query(
        'UPDATE shipments SET status = ? WHERE id = ?',
        [shipmentStatus, shipmentId]
      );
    }

    // Notify the business user about important milestones.
    const notificationDetails = {
      cargo_picked_up: {
        title: 'Cargo Picked Up',
        message: `Your shipment #${shipmentId} has been picked up by the logistics provider.`,
      },
      in_transit: {
        title: 'Shipment In Transit',
        message: `Your shipment #${shipmentId} is now in transit.`,
      },
      delivered: {
        title: 'Shipment Delivered',
        message: `Your shipment #${shipmentId} has been marked as delivered.`,
      },
    };

    const notification = notificationDetails[milestone];

    if (notification) {
      await connection.query(
        `INSERT INTO notifications (
          user_id, shipment_id, title, message
        ) VALUES (?, ?, ?, ?)`,
        [
          shipment.user_id,
          shipmentId,
          notification.title,
          notification.message,
        ]
      );
    }

    await connection.commit();
    transactionStarted = false;

    return {
      shipmentId,
      milestone,
      status: shipmentStatus,
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error(
          'Tracking transaction rollback failed:',
          rollbackError.message
        );
      }
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function getTrackingHistoryForUser(userId, shipmentId) {
  const [shipments] = await db.query(
    `SELECT id
     FROM shipments
     WHERE id = ? AND user_id = ?`,
    [shipmentId, userId]
  );

  if (shipments.length === 0) {
    return null;
  }

  const [rows] = await db.query(
    `SELECT
      st.id,
      st.milestone,
      st.remarks,
      st.created_at,
      u.name AS updated_by_name
     FROM shipment_tracking st
     JOIN users u ON u.id = st.updated_by
     WHERE st.shipment_id = ?
     ORDER BY st.created_at ASC, st.id ASC`,
    [shipmentId]
  );

  return rows;
}

module.exports = {
  trackingMilestones,
  addTrackingUpdate,
  getTrackingHistoryForUser,
};
