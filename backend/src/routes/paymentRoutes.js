const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  listMyPayments,
  listPaymentsForInvoice,
  submitPaymentReference,
} = require('../controllers/paymentController');

const router = express.Router();

// Only authenticated Business Users can access payment records.
router.use(
  authenticateToken,
  allowRoles('business_user')
);

// Get all payments for the logged-in Business User.
router.get('/', listMyPayments);

// Get payment records for a specific invoice.
router.get('/invoice/:invoiceId', listPaymentsForInvoice);

// Submit a UPI transaction reference.
router.post('/', submitPaymentReference);

module.exports = router;