
const express = require('express');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'You accessed a protected route',
    user: req.user,
  });
});

module.exports = router;
