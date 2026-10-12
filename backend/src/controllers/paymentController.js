const {
  getPaymentsForBusinessUser,
  getPaymentsForInvoice,
} = require('../services/paymentService');

async function listMyPayments(req, res) {
  try {
    const payments = await getPaymentsForBusinessUser(req.user.id);

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('List payments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment records',
    });
  }
}

async function listPaymentsForInvoice(req, res) {
  try {
    const invoiceId = Number(req.params.invoiceId);

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID',
      });
    }

    const payments = await getPaymentsForInvoice(
      req.user.id,
      invoiceId
    );

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('Invoice payments error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment records',
    });
  }
}

module.exports = {
  listMyPayments,
  listPaymentsForInvoice,
};