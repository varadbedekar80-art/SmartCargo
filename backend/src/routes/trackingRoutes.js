
const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  updateTracking,
  getTrackingHistory,
} = require('../controllers/trackingController');

const router = express.Router();

// Business users and assigned logistics providers can view tracking history.
router.get(
  '/:id',
  authenticateToken,
  allowRoles('business_user', 'provider'),
  getTrackingHistory
);

// Logistics providers can add tracking updates to their assigned shipments.
router.post(
  '/:id',
  authenticateToken,
  allowRoles('provider'),
  updateTracking
);

module.exports = router;
