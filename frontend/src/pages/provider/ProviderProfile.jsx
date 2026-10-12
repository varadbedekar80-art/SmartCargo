
import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

const emptyProfile = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  registrationNumber: '',
  address: '',
  transportModes: [],
  serviceRegions: '',
  description: '',
}

const transportOptions = ['Road', 'Sea', 'Air', 'Rail']

export default function ProviderProfile() {
  const [profile, setProfile] = useState(emptyProfile)
  const [form, setForm] = useState(emptyProfile)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('info')

  const showFeedback = (message, type = 'info') => {
    setFeedback(message)
    setFeedbackType(type)
  }

  const normalizeProfile = (data) => ({
    ...emptyProfile,
    ...(data || {}),
    transportModes: Array.isArray(data?.transportModes)
      ? data.transportModes
      : [],
  })

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoading(true)

      try {
        const response = await apiRequest('/provider/profile')
        const loadedProfile = normalizeProfile(response.profile)

        if (active) {
          setProfile(loadedProfile)
          setForm(loadedProfile)
        }
      } catch (error) {
        if (active) {
          showFeedback(
            error.message || 'Unable to load your provider profile.',
            'error',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [])

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  const toggleTransport = (mode) => {
    setForm((previous) => ({
      ...previous,
      transportModes: previous.transportModes.includes(mode)
        ? previous.transportModes.filter((item) => item !== mode)
        : [...previous.transportModes, mode],
    }))
  }

  const handleSave = async (event) => {
    event.preventDefault()

    if (form.transportModes.length === 0) {
      showFeedback('Select at least one transport mode.', 'error')
      return
    }

    if (!form.companyName.trim()) {
      showFeedback('Company name is required.', 'error')
      return
    }

    if (!form.contactName.trim()) {
      showFeedback('Contact person is required.', 'error')
      return
    }

    if (!form.email.trim()) {
      showFeedback('Business email is required.', 'error')
      return
    }

    if (!form.phone.trim()) {
      showFeedback('Contact number is required.', 'error')
      return
    }

    if (!form.address.trim()) {
      showFeedback('Business address is required.', 'error')
      return
    }

    if (!form.serviceRegions.trim()) {
      showFeedback('Service regions are required.', 'error')
      return
    }

    if (!form.description.trim()) {
      showFeedback('Company description is required.', 'error')
      return
    }

    setSaving(true)
    setFeedback('')

    try {
      const response = await apiRequest('/provider/profile', {
        method: 'PUT',
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          registrationNumber: form.registrationNumber.trim(),
          address: form.address.trim(),
          transportModes: form.transportModes,
          serviceRegions: form.serviceRegions.trim(),
          description: form.description.trim(),
        }),
      })

      const savedProfile = normalizeProfile(response.profile)

      setProfile(savedProfile)
      setForm(savedProfile)
      setEditing(false)
      showFeedback(
        response.message || 'Provider profile saved successfully.',
        'success',
      )
    } catch (error) {
      showFeedback(
        error.message || 'Unable to save your provider profile.',
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setForm({
      ...profile,
      transportModes: [...profile.transportModes],
    })
    setEditing(false)
    setFeedback('')
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-600'

  const initials = profile.companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 text-slate-900">
        <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">
            Loading your provider profile...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Account
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Provider Profile
            </h1>
            <p className="mt-2 text-slate-600">
              Manage your company details and logistics service information.
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => {
                setForm({
                  ...profile,
                  transportModes: [...profile.transportModes],
                })
                setEditing(true)
                setFeedback('')
              }}
              className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Edit Profile
            </button>
          )}
        </div>

        {feedback && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 rounded-xl border p-4 text-sm ${
              feedbackType === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : feedbackType === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-blue-200 bg-blue-50 text-blue-900'
            }`}
          >
            {feedback}
          </div>
        )}

        <div className="mt-7 grid gap-6 lg:grid-cols-3">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-blue-100 text-3xl font-extrabold text-blue-800">
                {initials || 'LP'}
              </div>

              <h2 className="mt-4 break-words text-xl font-extrabold">
                {profile.companyName || 'Your Company'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Logistics Service Provider
              </p>

              <span className="mt-4 inline-flex rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                Provider Account
              </span>

              <div className="mt-6 border-t border-slate-100 pt-5 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Registration Number
                </p>
                <p className="mt-2 break-words font-semibold">
                  {profile.registrationNumber || 'Not provided'}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold">Transport Capabilities</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.transportModes.map((mode) => (
                  <span
                    key={mode}
                    className="rounded-full bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700"
                  >
                    {mode}
                  </span>
                ))}
                {profile.transportModes.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No transport modes added yet.
                  </p>
                )}
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                These capabilities are loaded from your saved provider profile.
              </p>
            </section>
          </aside>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:col-span-2">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-xl font-extrabold">Company Information</h2>
              <p className="mt-1 text-sm text-slate-500">
                Keep your business contact and service details up to date.
              </p>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="companyName" className="text-sm font-semibold">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    required
                    maxLength={150}
                    disabled={!editing || saving}
                    value={form.companyName}
                    onChange={(event) =>
                      updateField('companyName', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="contactName" className="text-sm font-semibold">
                    Contact Person
                  </label>
                  <input
                    id="contactName"
                    required
                    maxLength={100}
                    disabled={!editing || saving}
                    value={form.contactName}
                    onChange={(event) =>
                      updateField('contactName', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="providerEmail" className="text-sm font-semibold">
                    Business Email
                  </label>
                  <input
                    id="providerEmail"
                    type="email"
                    required
                    maxLength={150}
                    disabled={!editing || saving}
                    value={form.email}
                    onChange={(event) =>
                      updateField('email', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="providerPhone" className="text-sm font-semibold">
                    Contact Number
                  </label>
                  <input
                    id="providerPhone"
                    type="tel"
                    required
                    maxLength={20}
                    disabled={!editing || saving}
                    value={form.phone}
                    onChange={(event) =>
                      updateField('phone', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="registrationNumber"
                    className="text-sm font-semibold"
                  >
                    Business Registration Number
                  </label>
                  <input
                    id="registrationNumber"
                    maxLength={100}
                    disabled={!editing || saving}
                    value={form.registrationNumber}
                    onChange={(event) =>
                      updateField('registrationNumber', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="providerAddress"
                    className="text-sm font-semibold"
                  >
                    Business Address
                  </label>
                  <textarea
                    id="providerAddress"
                    required
                    maxLength={255}
                    rows={2}
                    disabled={!editing || saving}
                    value={form.address}
                    onChange={(event) =>
                      updateField('address', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-sm font-semibold">
                    Transport Modes
                  </label>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {transportOptions.map((mode) => (
                      <label
                        key={mode}
                        className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
                          editing
                            ? 'cursor-pointer border-slate-300'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={!editing || saving}
                          checked={form.transportModes.includes(mode)}
                          onChange={() => toggleTransport(mode)}
                          className="h-4 w-4 accent-blue-700"
                        />
                        {mode}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="serviceRegions" className="text-sm font-semibold">
                    Service Regions
                  </label>
                  <input
                    id="serviceRegions"
                    required
                    maxLength={300}
                    disabled={!editing || saving}
                    value={form.serviceRegions}
                    onChange={(event) =>
                      updateField('serviceRegions', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="providerDescription"
                    className="text-sm font-semibold"
                  >
                    Company Description
                  </label>
                  <textarea
                    id="providerDescription"
                    required
                    maxLength={1000}
                    rows={4}
                    disabled={!editing || saving}
                    value={form.description}
                    onChange={(event) =>
                      updateField('description', event.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              {editing && (
                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleCancel}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </section>
        </div>

        <p className="mt-6 text-sm leading-6 text-slate-500">
          Your company information is retrieved from and saved to your
          authenticated provider profile.
        </p>
      </div>
    </div>
  )
}
