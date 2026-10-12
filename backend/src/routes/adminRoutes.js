
const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  getAdminDashboard,
} = require('../controllers/adminController');

const {
  listUsers,
  getUserDetails,
} = require('../controllers/adminUserController');

const {
  listShipments,
  getShipmentDetails,
} = require('../controllers/adminShipmentController');

const {
  listOffers,
  getOfferDetails,
} = require('../controllers/adminOfferController');

const {
  listInvoices,
  getInvoiceDetails,
} = require('../controllers/adminInvoiceController');

const {
  listPayments,
  getPaymentDetails,
} = require('../controllers/adminPaymentController');

const {
  getShipmentTrackingHistory,
} = require('../controllers/adminTrackingController');

const {
  listCargo,
  getCargoDetails,
} = require('../controllers/adminCargoController');

const {
  getShipmentReportData,
  getMonthlyShipmentReportData,
} = require('../controllers/adminReportController');

const {
  getAdminSettings,
  updateAdminSettings,
  resetAdminSettings,
} = require('../controllers/adminSettingsController');

const router = express.Router();

// All admin routes require authentication and the admin role.
router.use(
  authenticateToken,
  allowRoles('admin')
);

// Dashboard monitoring.
router.get('/dashboard', getAdminDashboard);

// Read-only user monitoring.
router.get('/users', listUsers);
router.get('/users/:id', getUserDetails);

// Read-only shipment monitoring.
router.get('/shipments', listShipments);
router.get('/shipments/:id', getShipmentDetails);

// Read-only shipping offer monitoring.
router.get('/offers', listOffers);
router.get('/offers/:id', getOfferDetails);

// Read-only invoice monitoring.
router.get('/invoices', listInvoices);
router.get('/invoices/:id', getInvoiceDetails);

// Read-only payment monitoring.
router.get('/payments', listPayments);
router.get('/payments/:id', getPaymentDetails);

// Read-only tracking history for any shipment.
router.get(
  '/shipments/:shipmentId/tracking',
  getShipmentTrackingHistory
);

// Read-only cargo monitoring.
router.get('/cargo', listCargo);
router.get('/cargo/:id', getCargoDetails);

// Read-only shipment reports.
router.get('/reports/shipments', getShipmentReportData);
router.get('/reports/shipments/monthly', getMonthlyShipmentReportData);

// Admin settings.
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);
router.post('/settings/reset', resetAdminSettings);

module.exports = router;
