

const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');
const allowRoles = require('../middleware/roleMiddleware');

const {
  getProfile,
  updateProfile,
} = require('../controllers/businessProfileController');

const router = express.Router();

router.use(authenticateToken, allowRoles('business_user'));

router.get('/', getProfile);
router.put('/', updateProfile);

module.exports = router;
