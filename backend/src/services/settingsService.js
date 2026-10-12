
const db = require('../config/db');

const DEFAULT_SETTINGS = {
  notifications: {
    shipmentUpdates: true,
    paymentReminders: true,
    offerUpdates: false,
    emailNotifications: true,
  },
  preferences: {
    language: 'English',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD MMM YYYY',
  },
};

// Only these roles can use this settings service.
// Table names come from this fixed map, never from request input.
const SETTINGS_TABLES = {
  business_user: 'business_user_settings',
  provider: 'provider_settings',
};

function getSettingsTable(role) {
  const table = SETTINGS_TABLES[role];

  if (!table) {
    throw new Error('Unsupported role for settings.');
  }

  return table;
}

function createDefaultSettings() {
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications },
    preferences: { ...DEFAULT_SETTINGS.preferences },
  };
}

function formatSettings(row) {
  if (!row) {
    return createDefaultSettings();
  }

  return {
    notifications: {
      shipmentUpdates: Boolean(row.shipment_updates),
      paymentReminders: Boolean(row.payment_reminders),
      offerUpdates: Boolean(row.offer_updates),
      emailNotifications: Boolean(row.email_notifications),
    },
    preferences: {
      language: row.language,
      timezone: row.timezone,
      dateFormat: row.date_format,
    },
  };
}

async function getSettings(userId, role) {
  const table = getSettingsTable(role);

  const [rows] = await db.execute(
    `SELECT shipment_updates, payment_reminders, offer_updates,
            email_notifications, language, timezone, date_format
     FROM ${table}
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows.length ? formatSettings(rows[0]) : createDefaultSettings();
}

async function saveSettings(userId, role, settings) {
  const table = getSettingsTable(role);
  const { notifications, preferences } = settings;

  await db.execute(
    `INSERT INTO ${table} (
       user_id, shipment_updates, payment_reminders, offer_updates,
       email_notifications, language, timezone, date_format
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       shipment_updates = VALUES(shipment_updates),
       payment_reminders = VALUES(payment_reminders),
       offer_updates = VALUES(offer_updates),
       email_notifications = VALUES(email_notifications),
       language = VALUES(language),
       timezone = VALUES(timezone),
       date_format = VALUES(date_format)`,
    [
      userId,
      notifications.shipmentUpdates,
      notifications.paymentReminders,
      notifications.offerUpdates,
      notifications.emailNotifications,
      preferences.language,
      preferences.timezone,
      preferences.dateFormat,
    ]
  );

  return getSettings(userId, role);
}

module.exports = {
  getSettings,
  saveSettings,
};
