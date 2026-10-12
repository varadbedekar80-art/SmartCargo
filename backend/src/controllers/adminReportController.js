const {
  getShipmentReport,
  getMonthlyShipmentReport,
} = require('../services/adminReportService');

async function getShipmentReportData(req, res) {
  try {
    const report = await getShipmentReport();

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Admin shipment report error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve shipment report',
    });
  }
}

async function getMonthlyShipmentReportData(req, res) {
  try {
    const report = await getMonthlyShipmentReport();

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Admin monthly report error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly shipment report',
    });
  }
}

module.exports = {
  getShipmentReportData,
  getMonthlyShipmentReportData,
};