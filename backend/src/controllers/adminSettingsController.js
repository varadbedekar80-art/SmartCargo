
const {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
  resetSettings,
} = require('../services/adminSettingsService');

const ALLOWED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'];
const ALLOWED_LANGUAGES = ['English', 'Hindi', 'Marathi'];
const ALLOWED_SESSION_TIMEOUTS = ['15', '30', '60', '120'];

function isNonEmptyString(value, maxLength) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= maxLength
  );
}

function validateSettings(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A valid settings object is required';
  }

  const {
    platformName,
    supportEmail,
    supportPhone,
    defaultCurrency,
    defaultLanguage,
    maintenanceMode,
    notifications,
    security,
  } = body;

  if (!isNonEmptyString(platformName, 100)) {
    return 'Platform name is required and must be at most 100 characters';
  }

  if (
    !isNonEmptyString(supportEmail, 255) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim())
  ) {
    return 'A valid support email is required';
  }

  if (!isNonEmptyString(supportPhone, 30)) {
    return 'Support phone is required and must be at most 30 characters';
  }

  if (!ALLOWED_CURRENCIES.includes(defaultCurrency)) {
    return 'Invalid default currency';
  }

  if (!ALLOWED_LANGUAGES.includes(defaultLanguage)) {
    return 'Invalid default language';
  }

  if (typeof maintenanceMode !== 'boolean') {
    return 'Maintenance mode must be true or false';
  }

  const notificationKeys = Object.keys(DEFAULT_SETTINGS.notifications);

  if (
    !notifications ||
    typeof notifications !== 'object' ||
    Array.isArray(notifications) ||
    notificationKeys.some(
      (key) => typeof notifications[key] !== 'boolean'
    )
  ) {
    return 'All notification preferences must be true or false';
  }

  const securityKeys = Object.keys(DEFAULT_SETTINGS.security);

  if (
    !security ||
    typeof security !== 'object' ||
    Array.isArray(security) ||
    securityKeys.some((key) => !(key in security))
  ) {
    return 'All security preferences are required';
  }

  if (typeof security.twoFactor !== 'boolean') {
    return 'Two-factor preference must be true or false';
  }

  if (typeof security.loginAlerts !== 'boolean') {
    return 'Login alerts preference must be true or false';
  }

  if (
    !ALLOWED_SESSION_TIMEOUTS.includes(String(security.sessionTimeout))
  ) {
    return 'Invalid session timeout preference';
  }

  return null;
}

async function getAdminSettings(req, res) {
  try {
    const settings = await getSettings();

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Get admin settings error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin settings',
    });
  }
}

async function updateAdminSettings(req, res) {
  try {
    const validationError = validateSettings(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const settings = {
      platformName: req.body.platformName.trim(),
      supportEmail: req.body.supportEmail.trim(),
      supportPhone: req.body.supportPhone.trim(),
      defaultCurrency: req.body.defaultCurrency,
      defaultLanguage: req.body.defaultLanguage,
      maintenanceMode: req.body.maintenanceMode,
      notifications: Object.fromEntries(
        Object.keys(DEFAULT_SETTINGS.notifications).map((key) => [
          key,
          req.body.notifications[key],
        ])
      ),
      security: {
        twoFactor: req.body.security.twoFactor,
        sessionTimeout: String(req.body.security.sessionTimeout),
        loginAlerts: req.body.security.loginAlerts,
      },
    };

    const savedSettings = await saveSettings(settings);

    return res.status(200).json({
      success: true,
      message: 'Admin settings saved successfully',
      settings: savedSettings,
    });
  } catch (error) {
    console.error('Update admin settings error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to save admin settings',
    });
  }
}

async function resetAdminSettings(req, res) {
  try {
    const settings = await resetSettings();

    return res.status(200).json({
      success: true,
      message: 'Admin settings reset successfully',
      settings,
    });
  } catch (error) {
    console.error('Reset admin settings error:', error.message);

    return res.status(500).json({
      success: false,
      message: 'Failed to reset admin settings',
    });
  }
}

module.exports = {
  getAdminSettings,
  updateAdminSettings,
  resetAdminSettings,
};
