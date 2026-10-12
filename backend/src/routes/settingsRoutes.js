
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  getMySettings,
  updateMySettings,
} = require('../controllers/settingsController');

router.use(
  authenticateToken,
  allowRoles('business_user', 'provider')
);

router.get('/', getMySettings);
router.put('/', updateMySettings);

module.exports = router;
