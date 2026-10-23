const {
  createShipment,
  getShipmentsByUser,
  getShipmentById,
} = require('../services/shipmentService');

function isValidDate(value) {
  if (typeof value !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function addShipment(req, res) {
  try {
    const {
      cargoId,
      origin,
      destination,
      offerId,
      departureDate,
    } = req.body;

    if (
      cargoId === undefined ||
      cargoId === null ||
      cargoId === '' ||
      !Number.isInteger(Number(cargoId)) ||
      Number(cargoId) <= 0 ||
      offerId === undefined ||
      offerId === null ||
      offerId === '' ||
      !Number.isInteger(Number(offerId)) ||
      Number(offerId) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid cargo ID and shipping offer ID are required',
      });
    }

    if (
      typeof origin !== 'string' ||
      !origin.trim() ||
      typeof destination !== 'string' ||
      !destination.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required',
      });
    }

    if (!isValidDate(departureDate)) {
      return res.status(400).json({
        success: false,
        message: 'A valid departure date is required in YYYY-MM-DD format',
      });
    }

    if (departureDate < getTodayDate()) {
      return res.status(400).json({
        success: false,
        message: 'Departure date cannot be in the past',
      });
    }

    const cleanOrigin = origin.trim();
    const cleanDestination = destination.trim();

    if (cleanOrigin.length > 150 || cleanDestination.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination cannot exceed 150 characters',
      });
    }

    if (
      cleanOrigin.toLowerCase() === cleanDestination.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination must be different',
      });
    }

    const shipment = await createShipment(req.user.id, {
      cargoId: Number(cargoId),
      origin: cleanOrigin,
      destination: cleanDestination,
      offerId: Number(offerId),
      departureDate,
    });

    return res.status(201).json({
      success: true,
      message: 'Shipment request submitted successfully',
      shipment,
    });
  } catch (error) {
    console.error('Create shipment error:', error.message);

    const errors = {
      CARGO_NOT_FOUND: [
        404,
        'Cargo not found or not owned by you',
      ],
      OFFER_NOT_AVAILABLE: [
        400,
        'The selected shipping offer is unavailable or does not match the selected departure date',
      ],
      CARGO_EXCEEDS_MAX_WEIGHT: [
        400,
        'Cargo exceeds the offer maximum weight or available capacity',
      ],
      ROUTE_MISMATCH: [
        400,
        'The selected offer does not cover this route',
      ],
    };

    if (errors[error.message]) {
      const [status, message] = errors[error.message];

      return res.status(status).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to submit shipment request',
    });
  }
}

async function listMyShipments(req, res) {
  try {
    const shipments = await getShipmentsByUser(req.user.id);

    return res.status(200).json({
      success: true,
      shipments,
    });
  } catch (error) {
    console.error('List shipments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipments',
    });
  }
}

async function getMyShipment(req, res) {
  try {
    const shipmentId = Number(req.params.id);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    const shipment = await getShipmentById(
      req.user.id,
      shipmentId
    );

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    return res.status(200).json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error('Get shipment error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipment',
    });
  }
}

module.exports = {
  addShipment,
  listMyShipments,
  getMyShipment,
};
