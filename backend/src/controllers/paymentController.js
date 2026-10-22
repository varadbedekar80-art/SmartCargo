const {
  getPaymentsForBusinessUser,
  getPaymentsForInvoice,
  createPaymentReference,
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

async function submitPaymentReference(req, res) {
  try {
    const invoiceId = Number(req.body.invoice_id);
    const paymentReference = String(
      req.body.payment_reference || ''
    ).trim();

    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid invoice ID is required.',
      });
    }

    if (
      paymentReference.length < 6 ||
      paymentReference.length > 255
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Transaction reference must be between 6 and 255 characters.',
      });
    }

    const payment = await createPaymentReference(
      req.user.id,
      invoiceId,
      paymentReference
    );

    return res.status(201).json({
      success: true,
      message:
        'Payment reference submitted and is pending verification.',
      payment,
    });
  } catch (error) {
    console.error(
      'Submit payment reference error:',
      error.message
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to submit the payment reference.',
    });
  }
}

module.exports = {
  listMyPayments,
  listPaymentsForInvoice,
  submitPaymentReference,
};