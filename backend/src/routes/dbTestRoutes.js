

const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await db.query('SELECT 1');

    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
    });
  } catch (error) {
    console.error(
      'Database connection test failed:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

module.exports = router;
