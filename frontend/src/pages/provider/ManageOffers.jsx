import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const emptyForm = {
  offerType: 'route_specific',
  mode: 'air',
  origin: '',
  destination: '',
  coverage: 'route_specific',
  ratePerKg: '',
  maxWeightKg: '',
  availableSpace: '',
  departureDate: '',
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'

function formatMoney(value) {
  const amount = Number(value)
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '—'
}

function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number)
    ? number.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : '—'
}

function displayMode(mode) {
  const modes = { air: 'Air', sea: 'Sea', road: 'Road' }
  return modes[String(mode || '').toLowerCase()] || mode || '—'
}

function displayStatus(status) {
  return String(status || '').toLowerCase() === 'active'
    ? 'Active'
    : 'Inactive'
}

function offerTitle(offer) {
  if (offer.offer_type === 'general_capacity') {
    return `${displayMode(offer.mode)} General Capacity`
  }

  return `${offer.origin || 'Origin'} to ${offer.destination || 'Destination'}`
}

function formatDepartureDate(value) {
  if (!value) return 'Not set'

  const dateString = String(value).slice(0, 10)
  const date = new Date(`${dateString}T00:00:00`)

  return Number.isNaN(date.getTime())
    ? 'Not set'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

function getTodayDate() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export default function ManageOffers() {
  const [offers, setOffers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [changingId, setChangingId] = useState(null)
  const [loadError, setLoadError] = useState('')

  const loadOffers = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const data = await apiRequest('/offers/my')
      setOffers(Array.isArray(data.offers) ? data.offers : [])
    } catch (error) {
      setLoadError(error.message || 'Unable to load your offers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOffers()
  }, [loadOffers])

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return offers.filter((offer) => {
      const title = offerTitle(offer)
      const id = String(offer.id ?? '')
      const origin = String(offer.origin || '')
      const destination = String(offer.destination || '')
      const departureDate = formatDepartureDate(offer.departure_date)
      const status = displayStatus(offer.status)
      const mode = displayMode(offer.mode)

      const matchesSearch =
        !query ||
        title.toLowerCase().includes(query) ||
        id.toLowerCase().includes(query) ||
        origin.toLowerCase().includes(query) ||
        destination.toLowerCase().includes(query) ||
        departureDate.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All' || status === statusFilter

      const matchesMode =
        modeFilter === 'All' || mode === modeFilter

      return matchesSearch && matchesStatus && matchesMode
    })
  }, [offers, search, statusFilter, modeFilter])

  const activeCount = offers.filter(
    (offer) => String(offer.status).toLowerCase() === 'active',
  ).length

  const inactiveCount = offers.length - activeCount

  const openCreateForm = () => {
    setForm({ ...emptyForm })
    setShowForm(true)
    setFeedback('')
  }

  const closeForm = () => {
    if (submitting) return
    setShowForm(false)
    setForm({ ...emptyForm })
  }

  const updateForm = (field, value) => {
    setForm((previous) => {
      const next = { ...previous, [field]: value }

      if (field === 'offerType') {
        if (value === 'route_specific') {
          next.coverage = 'route_specific'
        } else {
          next.coverage =
            previous.coverage === 'global' ||
            previous.coverage === 'nationwide'
              ? previous.coverage
              : 'global'

          next.origin = ''
          next.destination = ''
        }
      }

      if (field === 'coverage' && value !== 'route_specific') {
        next.offerType = 'general_capacity'
        next.origin = ''
        next.destination = ''
      }

      if (field === 'coverage' && value === 'route_specific') {
        next.offerType = 'route_specific'
      }

      return next
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')

    const ratePerKg = Number(form.ratePerKg)
    const maxWeightKg = Number(form.maxWeightKg)

    const availableSpace =
      form.availableSpace.trim() === ''
        ? maxWeightKg
        : Number(form.availableSpace)

    if (!Number.isFinite(ratePerKg) || ratePerKg <= 0) {
      setFeedbackType('error')
      setFeedback('Enter a rate per kg greater than zero.')
      return
    }

    if (!Number.isFinite(maxWeightKg) || maxWeightKg <= 0) {
      setFeedbackType('error')
      setFeedback('Enter a maximum weight greater than zero.')
      return
    }

    if (
      !Number.isFinite(availableSpace) ||
      availableSpace < 0 ||
      availableSpace > maxWeightKg
    ) {
      setFeedbackType('error')
      setFeedback('Available space must be between zero and maximum weight.')
      return
    }

    if (
      form.offerType === 'route_specific' &&
      (
        !form.origin.trim() ||
        !form.destination.trim() ||
        form.origin.trim().toLowerCase() ===
          form.destination.trim().toLowerCase()
      )
    ) {
      setFeedbackType('error')
      setFeedback('Enter different origin and destination locations.')
      return
    }

    if (!form.departureDate) {
      setFeedbackType('error')
      setFeedback('Select the cargo departure date.')
      return
    }

    if (form.departureDate < getTodayDate()) {
      setFeedbackType('error')
      setFeedback('Cargo departure date cannot be in the past.')
      return
    }

    const payload = {
      offerType: form.offerType,
      mode: form.mode,
      origin:
        form.offerType === 'route_specific'
          ? form.origin.trim()
          : null,
      destination:
        form.offerType === 'route_specific'
          ? form.destination.trim()
          : null,
      coverage: form.coverage,
      ratePerKg,
      maxWeightKg,
      availableSpace,
      departureDate: form.departureDate,
    }

    setSubmitting(true)

    try {
      const data = await apiRequest('/offers', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setFeedbackType('success')
      setFeedback(data.message || 'Shipping offer created successfully.')
      setShowForm(false)
      setForm({ ...emptyForm })

      await loadOffers()
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Unable to create the offer.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (offer) => {
    const id = offer.id
    const currentStatus = String(offer.status || '').toLowerCase()
    const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'

    setFeedback('')
    setChangingId(id)

    try {
      const data = await apiRequest(`/offers/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })

      setOffers((previous) =>
        previous.map((item) =>
          String(item.id) === String(id)
            ? { ...item, status: nextStatus }
            : item,
        ),
      )

      setFeedbackType('success')
      setFeedback(data.message || `Offer ${nextStatus} successfully.`)
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Unable to update offer status.')
      await loadOffers()
    } finally {
      setChangingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Pricing
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Manage Offers
            </h1>
            <p className="mt-2 text-slate-600">
              Create shipping offers and manage the availability of your services.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-800"
          >
            + Create New Offer
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-5 flex flex-col justify-between gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center ${
              feedbackType === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <p>{feedback}</p>
            <button
              type="button"
              onClick={() => setFeedback('')}
              className="self-start font-semibold hover:underline sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{loadError}</p>
            <button
              type="button"
              onClick={loadOffers}
              className="mt-2 font-semibold underline"
            >
              Retry loading offers
            </button>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: 'Total Offers',
              value: offers.length,
              icon: '🏷️',
              color: 'bg-blue-50 text-blue-700',
            },
            {
              title: 'Active Offers',
              value: activeCount,
              icon: '✅',
              color: 'bg-emerald-50 text-emerald-700',
            },
            {
              title: 'Inactive Offers',
              value: inactiveCount,
              icon: '⏸️',
              color: 'bg-amber-50 text-amber-700',
            },
          ].map((stat) => (
            <div
              key={stat.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl ${stat.color}`}
                >
                  {stat.icon}
                </span>
              </div>
              <p className="mt-4 text-3xl font-extrabold">
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by offer, ID, route, or date..."
              aria-label="Search offers"
              className={inputClass}
            />

            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
              aria-label="Filter offers by transport mode"
              className={inputClass}
            >
              <option value="All">All transport modes</option>
              <option value="Air">Air</option>
              <option value="Sea">Sea</option>
              <option value="Road">Road</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter offers by status"
              className={inputClass}
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">Offer</th>
                  <th className="px-4 py-4 font-semibold">Route / Coverage</th>
                  <th className="px-4 py-4 font-semibold">Transport</th>
                  <th className="px-4 py-4 font-semibold">Rate</th>
                  <th className="px-4 py-4 font-semibold">Available / Max</th>
                  <th className="px-4 py-4 font-semibold">Departure Date</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  filteredOffers.map((offer) => {
                    const active =
                      String(offer.status || '').toLowerCase() === 'active'

                    return (
                      <tr
                        key={offer.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold">{offerTitle(offer)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Offer #{offer.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {offer.offer_type === 'general_capacity'
                              ? 'General capacity'
                              : 'Route-specific'}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {offer.offer_type === 'general_capacity' ? (
                            <div>
                              <p className="font-medium">
                                {offer.coverage === 'global'
                                  ? 'Global coverage'
                                  : 'Nationwide coverage'}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                No fixed route
                              </p>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium">{offer.origin}</p>
                              <p className="my-1 text-xs text-blue-700">↓</p>
                              <p>{offer.destination}</p>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {displayMode(offer.mode)}
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {formatMoney(offer.rate_per_kg)}
                          <span className="mt-1 block text-xs font-normal text-slate-500">
                            per kg
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <p>{formatNumber(offer.available_space)} kg</p>
                          <p className="mt-1 text-xs text-slate-500">
                            of {formatNumber(offer.max_weight_kg)} kg
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {formatDepartureDate(offer.departure_date)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              active
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {displayStatus(offer.status)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            disabled={changingId === offer.id}
                            onClick={() => toggleStatus(offer)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {changingId === offer.id
                              ? 'Updating…'
                              : active
                                ? 'Pause'
                                : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {loading && (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading your offers…
              </div>
            )}

            {!loading && !loadError && filteredOffers.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">
                {offers.length === 0
                  ? 'You have not created any offers yet. Select “Create New Offer” to add one.'
                  : 'No offers match your search or selected filters.'}
              </div>
            )}
          </div>
        </section>

        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onClick={closeForm}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-form-title"
              className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Provider Services
                  </p>
                  <h2
                    id="offer-form-title"
                    className="mt-1 text-2xl font-extrabold"
                  >
                    Create New Offer
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Offers are saved to your provider account.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close offer form"
                  onClick={closeForm}
                  className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="offer-type"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Offer Type
                    </label>
                    <select
                      id="offer-type"
                      value={form.offerType}
                      onChange={(event) =>
                        updateForm('offerType', event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="route_specific">Route-specific</option>
                      <option value="general_capacity">General capacity</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="offer-mode"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Transport Mode
                    </label>
                    <select
                      id="offer-mode"
                      value={form.mode}
                      onChange={(event) =>
                        updateForm('mode', event.target.value)
                      }
                      className={inputClass}
                    >
                      <option value="air">Air Freight</option>
                      <option value="sea">Sea Freight</option>
                      <option value="road">Road Transport</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="offer-coverage"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Coverage
                    </label>
                    <select
                      id="offer-coverage"
                      value={form.coverage}
                      onChange={(event) =>
                        updateForm('coverage', event.target.value)
                      }
                      className={inputClass}
                    >
                      {form.offerType === 'route_specific' ? (
                        <option value="route_specific">Specific route</option>
                      ) : (
                        <>
                          <option value="global">Global</option>
                          <option value="nationwide">Nationwide</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="offer-rate"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Shipping Rate (₹ per kg)
                    </label>
                    <input
                      id="offer-rate"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.ratePerKg}
                      onChange={(event) =>
                        updateForm('ratePerKg', event.target.value)
                      }
                      placeholder="Enter rate per kg"
                      className={inputClass}
                    />
                  </div>

                  {form.offerType === 'route_specific' && (
                    <>
                      <div>
                        <label
                          htmlFor="offer-origin"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Origin
                        </label>
                        <input
                          id="offer-origin"
                          required
                          maxLength={150}
                          value={form.origin}
                          onChange={(event) =>
                            updateForm('origin', event.target.value)
                          }
                          placeholder="City, Country"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="offer-destination"
                          className="mb-2 block text-sm font-semibold"
                        >
                          Destination
                        </label>
                        <input
                          id="offer-destination"
                          required
                          maxLength={150}
                          value={form.destination}
                          onChange={(event) =>
                            updateForm('destination', event.target.value)
                          }
                          placeholder="City, Country"
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label
                      htmlFor="offer-departure-date"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Cargo Departure Date
                    </label>
                    <input
                      id="offer-departure-date"
                      type="date"
                      required
                      min={getTodayDate()}
                      value={form.departureDate}
                      onChange={(event) =>
                        updateForm('departureDate', event.target.value)
                      }
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Select the planned date the cargo will depart.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="offer-max-weight"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Maximum Weight (kg)
                    </label>
                    <input
                      id="offer-max-weight"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.maxWeightKg}
                      onChange={(event) =>
                        updateForm('maxWeightKg', event.target.value)
                      }
                      placeholder="Maximum supported weight"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="offer-available-space"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Available Space (kg)
                    </label>
                    <input
                      id="offer-available-space"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.availableSpace}
                      onChange={(event) =>
                        updateForm('availableSpace', event.target.value)
                      }
                      placeholder="Blank means maximum weight"
                      className={inputClass}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Must not exceed the maximum weight. Leave blank to use
                      the maximum weight as the initial available space.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={closeForm}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Creating…' : 'Create Offer'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
