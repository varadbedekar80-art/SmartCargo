
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

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

const NOTIFICATION_OPTIONS = [
  {
    key: 'shipmentUpdates',
    title: 'Shipment Updates',
    description: 'Receive updates about your shipments.',
  },
  {
    key: 'paymentReminders',
    title: 'Payment Reminders',
    description: 'Receive reminders about payment-related activities.',
  },
  {
    key: 'offerUpdates',
    title: 'Offer Updates',
    description: 'Receive updates about your submitted shipping offers.',
  },
  {
    key: 'emailNotifications',
    title: 'Email Notifications',
    description: 'Enable or disable email notifications from Smart Cargo.',
  },
];

const LANGUAGES = ['English', 'Hindi', 'Marathi'];

const TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'Asia/Singapore',
  'UTC',
];

const DATE_FORMATS = [
  'DD MMM YYYY',
  'DD/MM/YYYY',
  'MM/DD/YYYY',
];

function cloneSettings(settings) {
  return {
    notifications: { ...settings.notifications },
    preferences: { ...settings.preferences },
  };
}

export default function ProviderSettings({ onLogout }) {
  const [settings, setSettings] = useState(() =>
    cloneSettings(DEFAULT_SETTINGS)
  );
  const [savedSettings, setSavedSettings] = useState(() =>
    cloneSettings(DEFAULT_SETTINGS)
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError('');

      try {
        const response = await apiRequest('/settings');

        if (!response.settings) {
          throw new Error('The server did not return your settings.');
        }

        const loaded = {
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...response.settings.notifications,
          },
          preferences: {
            ...DEFAULT_SETTINGS.preferences,
            ...response.settings.preferences,
          },
        };

        if (active) {
          setSettings(cloneSettings(loaded));
          setSavedSettings(cloneSettings(loaded));
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              'Unable to load settings. Please try again.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  function updateNotification(key, value) {
    setSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: value,
      },
    }));

    setFeedback('');
    setError('');
  }

  function updatePreference(key, value) {
    setSettings((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        [key]: value,
      },
    }));

    setFeedback('');
    setError('');
  }

  async function saveSettings() {
    setSaving(true);
    setError('');
    setFeedback('');

    try {
      const response = await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });

      if (!response.settings) {
        throw new Error('The server did not return the saved settings.');
      }

      const saved = {
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...response.settings.notifications,
        },
        preferences: {
          ...DEFAULT_SETTINGS.preferences,
          ...response.settings.preferences,
        },
      };

      setSettings(cloneSettings(saved));
      setSavedSettings(cloneSettings(saved));
      setFeedbackType('success');
      setFeedback(response.message || 'Settings saved successfully.');
    } catch (err) {
      setFeedbackType('error');
      setError(err.message || 'Unable to save your settings.');
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSettings(cloneSettings(savedSettings));
    setFeedback('');
    setError('');
  }

  function confirmLogout() {
    setShowLogoutConfirm(false);

    if (typeof onLogout === 'function') {
      onLogout();
    } else {
      setFeedbackType('error');
      setError('Logout is not connected to the application.');
    }
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100';

  const cardClass =
    'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Account Management
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Provider Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your notification preferences and regional settings
            for your Smart Cargo provider account.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              feedbackType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {feedback}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-500">
              Loading your settings...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Notification Preferences
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose which notifications you want to receive.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {NOTIFICATION_OPTIONS.map((option) => (
                  <div
                    key={option.key}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">
                        {option.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {option.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.notifications[option.key]}
                      aria-label={option.title}
                      onClick={() =>
                        updateNotification(
                          option.key,
                          !settings.notifications[option.key]
                        )
                      }
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                        settings.notifications[option.key]
                          ? 'bg-blue-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                          settings.notifications[option.key]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Regional Preferences
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose your preferred language, time zone and date format.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Language
                  <select
                    className={inputClass}
                    value={settings.preferences.language}
                    onChange={(event) =>
                      updatePreference('language', event.target.value)
                    }
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Time Zone
                  <select
                    className={inputClass}
                    value={settings.preferences.timezone}
                    onChange={(event) =>
                      updatePreference('timezone', event.target.value)
                    }
                  >
                    {TIMEZONES.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                  Date Format
                  <select
                    className={inputClass}
                    value={settings.preferences.dateFormat}
                    onChange={(event) =>
                      updatePreference('dateFormat', event.target.value)
                    }
                  >
                    {DATE_FORMATS.map((format) => (
                      <option key={format} value={format}>
                        {format}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <section className={cardClass}>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Security &amp; Account
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Manage access to your provider account.
                </p>
              </div>

              <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    Log Out
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Sign out of your Smart Cargo provider account.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Log Out
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-slate-400">
                Password changes are not available through this page because
                a password-change API has not been connected here.
              </p>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetSettings}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Reset Unsaved Changes
              </button>

              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            <p className="text-center text-xs text-slate-400">
              Your saved preferences are associated with your provider account.
            </p>
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
              !
            </div>

            <h2
              id="logout-title"
              className="text-xl font-bold text-slate-900"
            >
              Confirm Logout
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Are you sure you want to log out of your Smart Cargo account?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
