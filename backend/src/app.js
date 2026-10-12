
const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const dbTestRoutes = require('./routes/dbTestRoutes');
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const cargoRoutes = require('./routes/cargoRoutes');
const offerRoutes = require('./routes/offerRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');
const providerShipmentRoutes = require('./routes/providerShipmentRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const businessProfileRoutes = require('./routes/businessProfileRoutes');
const providerRoutes = require('./routes/providerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

const allowedOrigins = (
  process.env.FRONTEND_URL || 'http://localhost:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as Postman.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// Health and database diagnostics
app.use('/api/health', healthRoutes);

if (process.env.NODE_ENV !== 'production') {
  app.use('/api/db-test', dbTestRoutes);
}

// Authentication and general routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);

// Cargo, offers, and shipments
app.use('/api/cargo', cargoRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/shipments', shipmentRoutes);

// Logistics Provider routes
app.use('/api/provider/shipments', providerShipmentRoutes);
app.use('/api/provider', providerRoutes);

// Tracking, invoices, payments, and notifications
app.use('/api/tracking', trackingRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);

// Administrator routes
app.use('/api/admin', adminRoutes);

// Business User routes
app.use('/api/business-profile', businessProfileRoutes);

// Shared settings routes
app.use('/api/settings', settingsRoutes);

module.exports = app;
