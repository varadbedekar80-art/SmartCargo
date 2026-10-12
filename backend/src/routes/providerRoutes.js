
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  getMyProfile,
  updateMyProfile,
} = require('../controllers/providerController');

router.use(authenticateToken, allowRoles('provider'));

router.get('/profile', getMyProfile);
router.put('/profile', updateMyProfile);

module.exports = router;
