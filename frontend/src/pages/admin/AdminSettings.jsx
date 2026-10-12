
import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

const initialNotifications = {
  newRegistrations: true,
  providerApplications: true,
  shipmentAlerts: true,
  paymentAlerts: true,
  systemAlerts: true,
  weeklyReports: false,
}

const initialPlatform = {
  platformName: 'Smart Cargo',
  supportEmail: 'support@smartcargo.com',
  supportPhone: '+91 1800 123 4567',
  defaultCurrency: 'INR',
  defaultLanguage: 'English',
  maintenanceMode: false,
}

const initialSecurity = {
  twoFactor: true,
  sessionTimeout: '30',
  loginAlerts: true,
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 ${
        checked ? 'bg-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}

export default function AdminSettings({ onLogout }) {
  const [platform, setPlatform] = useState({ ...initialPlatform })
  const [notifications, setNotifications] = useState({
    ...initialNotifications,
  })
  const [security, setSecurity] = useState({ ...initialSecurity })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('info')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      try {
        setLoading(true)

        const response = await apiRequest('/admin/settings')

        if (!response.success || !response.settings) {
          throw new Error('The server returned no settings.')
        }

        if (!active) return

        const settings = response.settings

        setPlatform({
          platformName: settings.platformName ?? initialPlatform.platformName,
          supportEmail: settings.supportEmail ?? initialPlatform.supportEmail,
          supportPhone: settings.supportPhone ?? initialPlatform.supportPhone,
          defaultCurrency:
            settings.defaultCurrency ?? initialPlatform.defaultCurrency,
          defaultLanguage:
            settings.defaultLanguage ?? initialPlatform.defaultLanguage,
          maintenanceMode:
            settings.maintenanceMode ?? initialPlatform.maintenanceMode,
        })

        setNotifications({
          ...initialNotifications,
          ...(settings.notifications || {}),
        })

        setSecurity({
          ...initialSecurity,
          ...(settings.security || {}),
          sessionTimeout: String(
            settings.security?.sessionTimeout ??
              initialSecurity.sessionTimeout,
          ),
        })

        setFeedback('')
      } catch (error) {
        if (active) {
          setFeedback(error.message || 'Failed to load admin settings.')
          setFeedbackType('error')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadSettings()

    return () => {
      active = false
    }
  }, [])

  const updatePlatform = (key, value) => {
    setPlatform((previous) => ({ ...previous, [key]: value }))
    setFeedback('')
  }

  const updateNotification = (key, value) => {
    setNotifications((previous) => ({ ...previous, [key]: value }))
    setFeedback('')
  }

  const updateSecurity = (key, value) => {
    setSecurity((previous) => ({ ...previous, [key]: value }))
    setFeedback('')
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFeedback('')

    try {
      const response = await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...platform,
          notifications,
          security,
        }),
      })

      if (!response.success || !response.settings) {
        throw new Error(response.message || 'Failed to save settings.')
      }

      const settings = response.settings

      setPlatform({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultCurrency: settings.defaultCurrency,
        defaultLanguage: settings.defaultLanguage,
        maintenanceMode: settings.maintenanceMode,
      })

      setNotifications({
        ...initialNotifications,
        ...settings.notifications,
      })

      setSecurity({
        ...initialSecurity,
        ...settings.security,
        sessionTimeout: String(settings.security.sessionTimeout),
      })

      setFeedbackType('success')
      setFeedback('Settings saved successfully to the database.')
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset the saved admin settings to their default values?',
    )

    if (!confirmed) return

    setResetting(true)
    setFeedback('')

    try {
      const response = await apiRequest('/admin/settings/reset', {
        method: 'POST',
      })

      if (!response.success || !response.settings) {
        throw new Error(response.message || 'Failed to reset settings.')
      }

      const settings = response.settings

      setPlatform({
        platformName: settings.platformName,
        supportEmail: settings.supportEmail,
        supportPhone: settings.supportPhone,
        defaultCurrency: settings.defaultCurrency,
        defaultLanguage: settings.defaultLanguage,
        maintenanceMode: settings.maintenanceMode,
      })

      setNotifications({
        ...initialNotifications,
        ...settings.notifications,
      })

      setSecurity({
        ...initialSecurity,
        ...settings.security,
        sessionTimeout: String(settings.security.sessionTimeout),
      })

      setFeedbackType('success')
      setFeedback('Settings reset to defaults and saved to the database.')
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Failed to reset settings.')
    } finally {
      setResetting(false)
    }
  }

  const handleLogout = () => {
    if (typeof onLogout !== 'function') {
      setFeedbackType('error')
      setFeedback('The application logout handler is unavailable.')
      return
    }

    if (window.confirm('Are you sure you want to log out?')) {
      onLogout()
    }
  }

  const notificationItems = [
    {
      key: 'newRegistrations',
      title: 'New User Registrations',
      description: 'Alerts when new business users register.',
    },
    {
      key: 'providerApplications',
      title: 'Provider Applications',
      description: 'Alerts when logistics providers apply.',
    },
    {
      key: 'shipmentAlerts',
      title: 'Shipment Activity',
      description: 'Notifications about shipment status changes.',
    },
    {
      key: 'paymentAlerts',
      title: 'Payment Alerts',
      description: 'Notifications about payment and invoice events.',
    },
    {
      key: 'systemAlerts',
      title: 'System Alerts',
      description: 'Important platform and operational alerts.',
    },
    {
      key: 'weeklyReports',
      title: 'Weekly Reports',
      description: 'Preference for a weekly platform activity summary.',
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">Loading admin settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Administration / Configuration
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Admin Settings
          </h1>
          <p className="mt-2 text-slate-600">
            Configure platform preferences, notifications, and security
            preferences.
          </p>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
              feedbackType === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {feedback}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-7 space-y-7">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Platform Configuration</h2>
            <p className="mt-1 text-sm text-slate-500">
              General platform information.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="platform-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Platform Name
                </label>
                <input
                  id="platform-name"
                  value={platform.platformName}
                  onChange={(event) =>
                    updatePlatform('platformName', event.target.value)
                  }
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="support-email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Support Email
                </label>
                <input
                  id="support-email"
                  type="email"
                  value={platform.supportEmail}
                  onChange={(event) =>
                    updatePlatform('supportEmail', event.target.value)
                  }
                  required
                  maxLength={255}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="support-phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  Support Phone
                </label>
                <input
                  id="support-phone"
                  type="tel"
                  value={platform.supportPhone}
                  onChange={(event) =>
                    updatePlatform('supportPhone', event.target.value)
                  }
                  required
                  maxLength={30}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="default-currency"
                  className="mb-2 block text-sm font-semibold"
                >
                  Default Currency
                </label>
                <select
                  id="default-currency"
                  value={platform.defaultCurrency}
                  onChange={(event) =>
                    updatePlatform('defaultCurrency', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="default-language"
                  className="mb-2 block text-sm font-semibold"
                >
                  Default Language
                </label>
                <select
                  id="default-language"
                  value={platform.defaultLanguage}
                  onChange={(event) =>
                    updatePlatform('defaultLanguage', event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Marathi">Marathi</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-100 bg-red-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    Maintenance Mode
                  </p>
                  <p className="mt-1 text-xs leading-5 text-red-700">
                    Saved as a preference; it does not currently block
                    platform access.
                  </p>
                </div>
                <Toggle
                  checked={platform.maintenanceMode}
                  onChange={(value) =>
                    updatePlatform('maintenanceMode', value)
                  }
                  label="Maintenance mode preference"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose which events you want to monitor.
            </p>

            <div className="mt-5 divide-y divide-slate-100">
              {notificationItems.map((item) => (
                <SettingRow
                  key={item.key}
                  title={item.title}
                  description={item.description}
                >
                  <Toggle
                    checked={notifications[item.key]}
                    onChange={(value) =>
                      updateNotification(item.key, value)
                    }
                    label={item.title}
                  />
                </SettingRow>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Security Preferences</h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure administrator security preferences.
            </p>

            <div className="mt-5 divide-y divide-slate-100">
              <SettingRow
                title="Two-Factor Authentication"
                description="Preference for an additional sign-in verification step."
              >
                <Toggle
                  checked={security.twoFactor}
                  onChange={(value) => updateSecurity('twoFactor', value)}
                  label="Two-factor authentication preference"
                />
              </SettingRow>

              <SettingRow
                title="Login Alerts"
                description="Preference for notifications about sign-in activity."
              >
                <Toggle
                  checked={security.loginAlerts}
                  onChange={(value) => updateSecurity('loginAlerts', value)}
                  label="Login alerts preference"
                />
              </SettingRow>

              <div className="py-4">
                <label
                  htmlFor="session-timeout"
                  className="block text-sm font-semibold"
                >
                  Session Timeout Preference
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  Desired inactivity period before a session expires.
                </p>
                <select
                  id="session-timeout"
                  value={security.sessionTimeout}
                  onChange={(event) =>
                    updateSecurity('sessionTimeout', event.target.value)
                  }
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 md:max-w-sm"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
            </div>

            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              These security values are persisted preferences. Two-factor
              verification, session expiry, and access restrictions must still
              be implemented and enforced by the backend.
            </p>
          </section>

          <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting || saving}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resetting ? 'Resetting...' : 'Reset Defaults'}
            </button>

            <button
              type="submit"
              disabled={saving || resetting}
              className="rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <section className="mt-7 rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-red-700">Account Session</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign out of your current administrator session.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
          >
            Log Out
          </button>
        </section>
      </div>
    </div>
  )
}
