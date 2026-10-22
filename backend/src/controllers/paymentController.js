
const {
  getPaymentsForBusinessUser,
  getPaymentsForInvoice,
  createPaymentReference,
  getPendingPaymentsForProvider,
  reviewPaymentForProvider,
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
        message: 'Transaction reference must be 6–255 characters.',
      });
    }

    const payment = await createPaymentReference(
      req.user.id,
      invoiceId,
      paymentReference
    );

    return res.status(201).json({
      success: true,
      message: 'Reference submitted for verification.',
      payment,
    });
  } catch (error) {
    console.error('Submit payment reference error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to submit payment reference.',
    });
  }
}

async function listProviderPendingPayments(req, res) {
  try {
    const payments = await getPendingPaymentsForProvider(req.user.id);

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('List provider payments error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending payments.',
    });
  }
}

async function reviewProviderPayment(req, res) {
  try {
    const paymentId = Number(req.params.paymentId);
    const decision = String(req.body.decision || '').toLowerCase();
    const rejectionReason = String(
      req.body.rejection_reason || ''
    ).trim();

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID.',
      });
    }

    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'Decision must be approve or reject.',
      });
    }

    if (decision === 'reject' && rejectionReason.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Provide a reason for rejecting the reference.',
      });
    }

    if (rejectionReason.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason must be 500 characters or fewer.',
      });
    }

    const payment = await reviewPaymentForProvider(
      req.user.id,
      paymentId,
      decision,
      decision === 'reject' ? rejectionReason : null
    );

    return res.status(200).json({
      success: true,
      message:
        decision === 'approve'
          ? 'Payment marked as paid after verification.'
          : 'Payment reference rejected.',
      payment,
    });
  } catch (error) {
    console.error('Review provider payment error:', error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : 'Failed to review payment.',
    });
  }
}

module.exports = {
  listMyPayments,
  listPaymentsForInvoice,
  submitPaymentReference,
  listProviderPendingPayments,
  reviewProviderPayment,
};
