

const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  listMyInvoices,
  getMyInvoice,
  listMyProviderInvoices,
  getMyProviderInvoice,
} = require('../controllers/invoiceController');

const router = express.Router();

// Provider invoice endpoints.
router.get(
  '/provider',
  authenticateToken,
  allowRoles('provider'),
  listMyProviderInvoices
);

router.get(
  '/provider/:id',
  authenticateToken,
  allowRoles('provider'),
  getMyProviderInvoice
);

// Business User invoice endpoints.
router.get(
  '/',
  authenticateToken,
  allowRoles('business_user'),
  listMyInvoices
);

router.get(
  '/:id',
  authenticateToken,
  allowRoles('business_user'),
  getMyInvoice
);

module.exports = router;
