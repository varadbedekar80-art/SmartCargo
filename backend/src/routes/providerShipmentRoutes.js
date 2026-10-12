const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  listProviderShipments,
  handleShipmentResponse,
} = require('../controllers/providerShipmentController');

const router = express.Router();

router.use(authenticateToken, allowRoles('provider'));

router.get('/', listProviderShipments);
router.patch('/:id/respond', handleShipmentResponse);

module.exports = router;