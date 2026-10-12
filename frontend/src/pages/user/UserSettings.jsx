
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

const DEFAULT_NOTIFICATIONS = {
  shipmentUpdates: true,
  paymentReminders: true,
  offerUpdates: false,
  emailNotifications: true,
};

const DEFAULT_PREFERENCES = {
  language: 'English',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
};

export default function UserSettings() {
  const [notifications, setNotifications] = useState({
    ...DEFAULT_NOTIFICATIONS,
  });

  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the logged-in user's saved settings.
  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        setError('');

        const result = await apiRequest('/settings');

        if (!result.success) {
          throw new Error(result.message || 'Unable to load settings.');
        }

        if (!cancelled && result.settings) {
          setNotifications({
            ...DEFAULT_NOTIFICATIONS,
            ...result.settings.notifications,
          });

          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...result.settings.preferences,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load your settings.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleNotification = (name) => {
    setNotifications((previous) => ({
      ...previous,
      [name]: !previous[name],
    }));

    setMessage('');
    setError('');
  };

  const updatePreference = (name, value) => {
    setPreferences((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage('');
    setError('');
  };

  // Save notification and regional preferences to MySQL.
  const handleSave = async (event) => {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const result = await apiRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify({
          notifications,
          preferences,
        }),
      });

      if (!result.success) {
        throw new Error(result.message || 'Unable to save settings.');
      }

      if (result.settings) {
        setNotifications({
          ...DEFAULT_NOTIFICATIONS,
          ...result.settings.notifications,
        });

        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...result.settings.preferences,
        });
      }

      setMessage(result.message || 'Your preferences have been saved.');
    } catch (err) {
      setError(err.message || 'Unable to save your settings.');
    } finally {
      setSaving(false);
    }
  };

  // Logout will be connected to the shared authentication flow later.
  const handleLogout = () => {
    const confirmed = window.confirm(
      'Do you want to log out of Smart Cargo?'
    );

    if (confirmed) {
      window.alert(
        'Logout will be connected during the final App.jsx integration.'
      );
    }
  };

  const notificationOptions = [
    {
      name: 'shipmentUpdates',
      title: 'Shipment updates',
      description:
        'Receive updates when a shipment is created, dispatched, or delivered.',
    },
    {
      name: 'paymentReminders',
      title: 'Payment reminders',
      description:
        'Get reminders about upcoming invoice due dates and outstanding payments.',
    },
    {
      name: 'offerUpdates',
      title: 'Logistics offers',
      description:
        'Receive notifications about new offers and logistics opportunities.',
    },
    {
      name: 'emailNotifications',
      title: 'Email notifications',
      description:
        'Receive important account and platform notifications by email.',
    },
  ];

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-5 text-slate-700 lg:p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          Loading your settings...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Business User / Account
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your notifications, regional preferences, and account access.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 font-semibold underline"
            >
              Reload settings
            </button>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-7 space-y-6">
          {/* Notification Preferences */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
                🔔
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  Notification Preferences
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose which updates you want to receive.
                </p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {notificationOptions.map((option) => (
                <div
                  key={option.name}
                  className="flex items-center justify-between gap-4 py-5"
                >
                  <div>
                    <h3 className="font-semibold">{option.title}</h3>

                    <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                      {option.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifications[option.name]}
                    aria-label={option.title}
                    onClick={() => toggleNotification(option.name)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      notifications[option.name]
                        ? 'bg-blue-700'
                        : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        notifications[option.name]
                          ? 'left-6'
                          : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Regional Preferences */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
                🌐
              </div>

              <div>
                <h2 className="text-xl font-bold">Regional Preferences</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Customize how information is displayed in your account.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="language"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Language
                </label>

                <select
                  id="language"
                  value={preferences.language}
                  onChange={(event) =>
                    updatePreference('language', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="timezone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Time zone
                </label>

                <select
                  id="timezone"
                  value={preferences.timezone}
                  onChange={(event) =>
                    updatePreference('timezone', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="Asia/Kolkata">
                    India Standard Time (IST)
                  </option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                  <option value="Europe/London">London</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Asia/Singapore">Singapore</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="dateFormat"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Date format
                </label>

                <select
                  id="dateFormat"
                  value={preferences.dateFormat}
                  onChange={(event) =>
                    updatePreference('dateFormat', event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="DD MMM YYYY">
                    DD MMM YYYY (11 Oct 2026)
                  </option>
                  <option value="DD/MM/YYYY">
                    DD/MM/YYYY (11/10/2026)
                  </option>
                  <option value="MM/DD/YYYY">
                    MM/DD/YYYY (10/11/2026)
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
                🔐
              </div>

              <div>
                <h2 className="text-xl font-bold">Security</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Keep your account protected.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">Password</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Change your account password periodically.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  window.alert(
                    'Password change will be connected to the backend authentication system later.'
                  )
                }
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Change Password
              </button>
            </div>

            <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold">Account information</h3>

                <p className="mt-1 text-sm text-slate-500">
                  Your account role and permissions are managed by Smart Cargo.
                </p>
              </div>

              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                Business User
              </span>
            </div>
          </section>

          {/* Save Preferences */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>

        {/* Logout */}
        <section className="mt-7 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-red-700">Logout</h2>

              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Sign out of your Smart Cargo account when you have finished
                managing your shipments.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700 hover:bg-red-50"
            >
              ↪ Logout
            </button>
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-slate-500">
          Smart Cargo Export &amp; Logistics Management System · Settings
        </p>
      </div>
    </div>
  );
}