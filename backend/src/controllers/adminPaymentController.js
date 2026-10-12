const {
  getAllPayments,
  getPaymentById,
} = require('../services/adminPaymentService');

async function listPayments(req, res) {
  try {
    const payments = await getAllPayments();

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Admin list payments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment records',
    });
  }
}

async function getPaymentDetails(req, res) {
  try {
    const paymentId = Number(req.params.id);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID',
      });
    }

    const payment = await getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('Admin payment details error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment details',
    });
  }
}

module.exports = {
  listPayments,
  getPaymentDetails,
};