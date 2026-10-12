
const db = require('../config/db');

const DEFAULT_SETTINGS = {
  platformName: 'Smart Cargo',
  supportEmail: 'support@smartcargo.com',
  supportPhone: '+91 1800 123 4567',
  defaultCurrency: 'INR',
  defaultLanguage: 'English',
  maintenanceMode: false,

  notifications: {
    newRegistrations: true,
    providerApplications: true,
    shipmentAlerts: true,
    paymentAlerts: true,
    systemAlerts: true,
    weeklyReports: false,
  },

  security: {
    twoFactor: true,
    sessionTimeout: '30',
    loginAlerts: true,
  },
};

function parseJson(value, fallback) {
  if (value && typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatSettings(row) {
  if (!row) return null;

  return {
    platformName: row.platform_name,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    defaultCurrency: row.default_currency,
    defaultLanguage: row.default_language,
    maintenanceMode: Boolean(row.maintenance_mode),
    notifications: parseJson(
      row.notification_preferences,
      DEFAULT_SETTINGS.notifications
    ),
    security: parseJson(
      row.security_preferences,
      DEFAULT_SETTINGS.security
    ),
    updatedAt: row.updated_at,
  };
}

async function getSettings() {
  const [rows] = await db.query(
    'SELECT * FROM admin_settings WHERE id = 1'
  );

  if (rows.length > 0) {
    return formatSettings(rows[0]);
  }

  return saveSettings(DEFAULT_SETTINGS);
}

async function saveSettings(settings) {
  const values = [
    settings.platformName,
    settings.supportEmail,
    settings.supportPhone,
    settings.defaultCurrency,
    settings.defaultLanguage,
    settings.maintenanceMode ? 1 : 0,
    JSON.stringify(settings.notifications),
    JSON.stringify(settings.security),
  ];

  await db.query(
    `INSERT INTO admin_settings (
      id,
      platform_name,
      support_email,
      support_phone,
      default_currency,
      default_language,
      maintenance_mode,
      notification_preferences,
      security_preferences
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      platform_name = VALUES(platform_name),
      support_email = VALUES(support_email),
      support_phone = VALUES(support_phone),
      default_currency = VALUES(default_currency),
      default_language = VALUES(default_language),
      maintenance_mode = VALUES(maintenance_mode),
      notification_preferences = VALUES(notification_preferences),
      security_preferences = VALUES(security_preferences)`,
    values
  );

  return getSavedSettings();
}

async function getSavedSettings() {
  const [rows] = await db.query(
    'SELECT * FROM admin_settings WHERE id = 1'
  );

  return formatSettings(rows[0]);
}

async function resetSettings() {
  return saveSettings(DEFAULT_SETTINGS);
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  resetSettings,
};
