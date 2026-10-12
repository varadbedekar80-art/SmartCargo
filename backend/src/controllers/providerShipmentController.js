const {
  getProviderShipments,
  respondToShipment,
} = require('../services/providerShipmentService');

async function listProviderShipments(req, res) {
  try {
    const shipments = await getProviderShipments(req.user.id);

    return res.status(200).json({
      success: true,
      shipments,
    });
  } catch (error) {
    console.error('List provider shipments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipment requests',
    });
  }
}

async function handleShipmentResponse(req, res) {
  try {
    const shipmentId = Number(req.params.id);
    const { decision } = req.body;

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be accept or reject',
      });
    }

    const result = await respondToShipment(
      req.user.id,
      shipmentId,
      decision
    );

    return res.status(200).json({
      success: true,
      message:
        decision === 'accept'
          ? 'Shipment request accepted successfully'
          : 'Shipment request rejected successfully',
      shipment: result,
    });
  } catch (error) {
    console.error('Respond to shipment error:', error.message);

    const errors = {
      SHIPMENT_NOT_FOUND: [
        404,
        'Shipment request not found',
      ],
      SHIPMENT_ALREADY_PROCESSED: [
        409,
        'This shipment request has already been processed',
      ],
      OFFER_NOT_FOUND: [
        404,
        'Shipping offer not found',
      ],
      OFFER_INACTIVE: [
        409,
        'This shipping offer is inactive',
      ],
      INSUFFICIENT_CAPACITY: [
        409,
        'Insufficient capacity to accept this shipment',
      ],
      INVALID_CARGO_WEIGHT: [
        409,
        'The shipment contains an invalid cargo weight',
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
      message: 'Failed to process shipment request',
    });
  }
}

module.exports = {
  listProviderShipments,
  handleShipmentResponse,
};