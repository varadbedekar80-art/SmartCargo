const express = require('express');

const authenticateToken = require('../middleware/authMiddleware');

const {
  listMyNotifications,
  markMyNotificationAsRead,
} = require('../controllers/notificationController');

const router = express.Router();

router.use(authenticateToken);

router.get('/', listMyNotifications);
router.patch('/:id/read', markMyNotificationAsRead);

module.exports = router;