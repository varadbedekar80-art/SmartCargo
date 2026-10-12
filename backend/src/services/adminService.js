
const db = require('../config/db');

async function getDashboardSummary() {
  const [userRows] = await db.query(
    `SELECT
      COUNT(*) AS total_users,
      COALESCE(SUM(role = 'business_user'), 0) AS business_users,
      COALESCE(SUM(role = 'provider'), 0) AS providers,
      COALESCE(SUM(role = 'admin'), 0) AS administrators
     FROM users`
  );

  const [shipmentRows] = await db.query(
    `SELECT
      COUNT(*) AS total_shipments,
      COALESCE(SUM(status = 'pending'), 0) AS pending_shipments,
      COALESCE(SUM(status = 'confirmed'), 0) AS confirmed_shipments,
      COALESCE(SUM(status = 'rejected'), 0) AS rejected_shipments,
      COALESCE(SUM(status = 'delivered'), 0) AS delivered_shipments
     FROM shipments`
  );

  const [offerRows] = await db.query(
    `SELECT
      COUNT(*) AS total_offers,
      COALESCE(SUM(status = 'active'), 0) AS active_offers,
      COALESCE(SUM(status = 'inactive'), 0) AS inactive_offers
     FROM shipping_offers`
  );

  const [invoiceRows] = await db.query(
    `SELECT
      COUNT(*) AS total_invoices,
      COALESCE(SUM(status = 'unpaid'), 0) AS unpaid_invoices,
      COALESCE(SUM(status = 'paid'), 0) AS paid_invoices,
      COALESCE(SUM(status = 'void'), 0) AS void_invoices
     FROM invoices`
  );

  const [paymentRows] = await db.query(
    `SELECT
      COUNT(*) AS total_payment_records,
      COALESCE(SUM(status = 'pending'), 0) AS pending_payments,
      COALESCE(SUM(status = 'successful'), 0) AS successful_payments,
      COALESCE(SUM(status = 'failed'), 0) AS failed_payments
     FROM payments`
  );

  return {
    users: userRows[0],
    shipments: shipmentRows[0],
    offers: offerRows[0],
    invoices: invoiceRows[0],
    payments: paymentRows[0],
  };
}

module.exports = {
  getDashboardSummary,
};
