
const settingsService = require('../services/settingsService');

const ALLOWED_LANGUAGES = ['English', 'Hindi', 'Marathi'];

const ALLOWED_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Singapore',
];

const ALLOWED_DATE_FORMATS = [
  'DD MMM YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

const ALLOWED_ROLES = ['business_user', 'provider'];

async function getMySettings(req, res) {
  try {
    const { id, role } = req.user;

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not allowed to access these settings.',
      });
    }

    const settings = await settingsService.getSettings(id, role);

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load your settings.',
    });
  }
}

async function updateMySettings(req, res) {
  try {
    const { id, role } = req.user;

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not allowed to update these settings.',
      });
    }

    const { notifications, preferences } = req.body || {};

    if (!notifications || !preferences) {
      return res.status(400).json({
        success: false,
        message: 'Notifications and preferences are required.',
      });
    }

    const notificationKeys = [
      'shipmentUpdates',
      'paymentReminders',
      'offerUpdates',
      'emailNotifications',
    ];

    for (const key of notificationKeys) {
      if (typeof notifications[key] !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: `Invalid notification setting: ${key}.`,
        });
      }
    }

    if (!ALLOWED_LANGUAGES.includes(preferences.language)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid language selection.',
      });
    }

    if (!ALLOWED_TIMEZONES.includes(preferences.timezone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time zone selection.',
      });
    }

    if (!ALLOWED_DATE_FORMATS.includes(preferences.dateFormat)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format selection.',
      });
    }

    const settings = await settingsService.saveSettings(
      id,
      role,
      { notifications, preferences }
    );

    return res.status(200).json({
      success: true,
      message: 'Settings saved successfully.',
      settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to save your settings.',
    });
  }
}

module.exports = {
  getMySettings,
  updateMySettings,
};
