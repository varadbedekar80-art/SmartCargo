
const {
  getTrackingHistoryForShipment,
} = require('../services/adminTrackingService');

async function getShipmentTrackingHistory(req, res) {
  try {
    const shipmentId = Number(req.params.shipmentId);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    const history = await getTrackingHistoryForShipment(shipmentId);

    // The service returns null when the shipment does not exist.
    if (history === null) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found',
      });
    }

    return res.status(200).json({
      success: true,
      shipmentId,
      count: history.length,
      history,
    });
  } catch (error) {
    console.error('Admin tracking history error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tracking history',
    });
  }
}

module.exports = {
  getShipmentTrackingHistory,
};
