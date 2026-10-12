const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  addShipment,
  listMyShipments,
  getMyShipment,
} = require('../controllers/shipmentController');

const router = express.Router();

router.use(authenticateToken, allowRoles('business_user'));

router.post('/', addShipment);
router.get('/', listMyShipments);
router.get('/:id', getMyShipment);

module.exports = router;