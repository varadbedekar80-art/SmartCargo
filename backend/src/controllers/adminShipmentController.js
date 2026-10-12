const {
  getAllShipments,
  getShipmentById,
} = require('../services/adminShipmentService');

async function listShipments(req, res) {
  try {
    const shipments = await getAllShipments();

    return res.status(200).json({
      success: true,
      count: shipments.length,
      shipments,
    });
  } catch (error) {
    console.error('Admin list shipments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipments',
    });
  }
}

async function getShipmentDetails(req, res) {
  try {
    const shipmentId = Number(req.params.id);

    if (!Number.isInteger(shipmentId) || shipmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid shipment ID',
      });
    }

    const shipment = await getShipmentById(shipmentId);

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
    console.error('Admin shipment details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipment details',
    });
  }
}

module.exports = {
  listShipments,
  getShipmentDetails,
};