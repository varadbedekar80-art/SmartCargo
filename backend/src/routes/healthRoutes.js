
const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      success: true,
      message: 'Smart Cargo backend is running',
      database: 'connected',
    });
  } catch (error) {
    console.error('Health check database error:', error.message);

    res.status(503).json({
      success: false,
      message: 'Backend is running, but database connection failed',
      database: 'disconnected',
    });
  }
});

module.exports = router;
