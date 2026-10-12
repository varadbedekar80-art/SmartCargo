const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  updateTracking,
  getTrackingHistory,
} = require('../controllers/trackingController');

const router = express.Router();

// Business Users can view tracking history for their own shipments.
router.get(
  '/:id',
  authenticateToken,
  allowRoles('business_user'),
  getTrackingHistory
);

// Logistics Providers can update tracking for shipments assigned through their offers.
router.post(
  '/:id',
  authenticateToken,
  allowRoles('provider'),
  updateTracking
);

module.exports = router;