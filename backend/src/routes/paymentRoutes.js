
const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  listMyPayments,
  listPaymentsForInvoice,
  submitPaymentReference,
  listProviderPendingPayments,
  reviewProviderPayment,
} = require('../controllers/paymentController');

const router = express.Router();

// Business User payment routes.
router.get(
  '/',
  authenticateToken,
  allowRoles('business_user'),
  listMyPayments
);

router.get(
  '/invoice/:invoiceId',
  authenticateToken,
  allowRoles('business_user'),
  listPaymentsForInvoice
);

router.post(
  '/',
  authenticateToken,
  allowRoles('business_user'),
  submitPaymentReference
);

// Logistics Provider verification routes.
router.get(
  '/provider/pending',
  authenticateToken,
  allowRoles('provider'),
  listProviderPendingPayments
);

router.patch(
  '/provider/:paymentId/review',
  authenticateToken,
  allowRoles('provider'),
  reviewProviderPayment
);

module.exports = router;
