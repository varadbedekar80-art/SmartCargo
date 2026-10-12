
const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  listMyPayments,
  listPaymentsForInvoice,
} = require('../controllers/paymentController');

const router = express.Router();

// Allow only authenticated Business Users to access payment records.
router.use(
  authenticateToken,
  allowRoles('business_user')
);

// Get all payment records for the logged-in Business User.
router.get('/', listMyPayments);

// Get payment records for a specific invoice.
router.get('/invoice/:invoiceId', listPaymentsForInvoice);

module.exports = router;
