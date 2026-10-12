
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-amber-50 text-amber-700',
  paused: 'bg-slate-100 text-slate-700',
  inactive: 'bg-slate-100 text-slate-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-orange-50 text-orange-700',
}

function formatStatus(status) {
  if (!status) return 'Unknown'

  return String(status)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '—'

  const amount = Number(value)

  return Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      })
    : String(value)
}

function formatNumber(value, unit = '') {
  if (value === null || value === undefined || value === '') return '—'

  const number = Number(value)

  if (!Number.isFinite(number)) return `${value}${unit}`

  return `${number.toLocaleString('en-IN')}${unit ? ` ${unit}` : ''}`
}

export default function AdminOffers() {
  const [offers, setOffers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadOffers() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest('/admin/offers')

        if (!data.success) {
          throw new Error(data.message || 'Failed to load shipping offers.')
        }

        if (!cancelled) {
          setOffers(data.offers || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load shipping offers.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOffers()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const countStatus = (status) =>
      offers.filter(
        (offer) => String(offer.status || '').toLowerCase() === status,
      ).length

    return {
      total: offers.length,
      active: countStatus('active'),
      pending:
        countStatus('pending') + countStatus('pending_review'),
      inactive: countStatus('inactive') + countStatus('paused'),
    }
  }, [offers])

  const statuses = useMemo(
    () => [...new Set(offers.map((offer) => offer.status).filter(Boolean))],
    [offers],
  )

  const modes = useMemo(
    () => [...new Set(offers.map((offer) => offer.mode).filter(Boolean))],
    [offers],
  )

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return offers.filter((offer) => {
      const matchesSearch =
        !query ||
        [
          offer.id,
          offer.company_name,
          offer.provider_name,
          offer.provider_email,
          offer.offer_type,
          offer.origin,
          offer.destination,
          offer.coverage,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        )

      const matchesStatus =
        statusFilter === 'All' || offer.status === statusFilter

      const matchesMode =
        modeFilter === 'All' ||
        String(offer.mode || '').toLowerCase() ===
          modeFilter.toLowerCase()

      return matchesSearch && matchesStatus && matchesMode
    })
  }, [offers, search, statusFilter, modeFilter])

  async function openOffer(offer) {
    setSelectedOffer(offer)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const data = await apiRequest(`/admin/offers/${offer.id}`)

      if (!data.success || !data.offer) {
        throw new Error(data.message || 'Failed to load offer details.')
      }

      setSelectedOffer(data.offer)
    } catch (err) {
      setDetailsError(err.message || 'Unable to load offer details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportCSV() {
    const columns = [
      ['id', 'Offer ID'],
      ['provider_id', 'Provider ID'],
      ['company_name', 'Company'],
      ['provider_name', 'Contact Name'],
      ['provider_email', 'Contact Email'],
      ['offer_type', 'Offer Type'],
      ['mode', 'Transport Mode'],
      ['origin', 'Origin'],
      ['destination', 'Destination'],
      ['coverage', 'Coverage'],
      ['rate_per_kg', 'Rate Per Kg'],
      ['max_weight_kg', 'Maximum Weight Kg'],
      ['available_space', 'Available Space'],
      ['status', 'Status'],
      ['created_at', 'Created Date'],
    ]

    const escapeCSV = (value) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`

    const rows = [
      columns.map(([, label]) => escapeCSV(label)).join(','),
      ...filteredOffers.map((offer) =>
        columns
          .map(([key]) => escapeCSV(offer[key]))
          .join(','),
      ),
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smart-cargo-offers.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const detailRows = selectedOffer
    ? [
        ['Offer ID', selectedOffer.id],
        ['Provider ID', selectedOffer.provider_id],
        ['Provider Company', selectedOffer.company_name],
        ['Contact Person', selectedOffer.provider_name],
        ['Contact Email', selectedOffer.provider_email],
        ['Offer Type', selectedOffer.offer_type],
        ['Transport Mode', selectedOffer.mode],
        ['Origin', selectedOffer.origin],
        ['Destination', selectedOffer.destination],
        ['Coverage', selectedOffer.coverage],
        ['Rate per Kg', formatPrice(selectedOffer.rate_per_kg)],
        [
          'Maximum Weight',
          formatNumber(selectedOffer.max_weight_kg, 'kg'),
        ],
        [
          'Available Space',
          formatNumber(selectedOffer.available_space, 'kg'),
        ],
        ['Status', formatStatus(selectedOffer.status)],
        ['Created Date', formatDate(selectedOffer.created_at)],
      ]
    : []

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Administration / Logistics Network
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Offer Management
            </h1>
            <p className="mt-2 text-slate-600">
              Review registered shipping offers, pricing, and transport coverage.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || Boolean(error) || filteredOffers.length === 0}
            className="w-fit rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Offers', value: stats.total, icon: '📋' },
            { label: 'Active Offers', value: stats.active, icon: '✓' },
            { label: 'Pending Review', value: stats.pending, icon: '⏳' },
            { label: 'Paused / Inactive', value: stats.inactive, icon: 'Ⅱ' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold">
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold">Shipping Offers</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading offers...'
                : `${filteredOffers.length} matching offer${filteredOffers.length === 1 ? '' : 's'}`}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search offers or providers..."
                aria-label="Search offers"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter offers by status"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">All statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>

              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                aria-label="Filter offers by transport mode"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">All transport modes</option>
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {formatStatus(mode)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Could not load offers</p>
              <p className="mt-1">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
              >
                Reload page
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Offer</th>
                  <th className="px-5 py-4 font-semibold">Provider</th>
                  <th className="px-5 py-4 font-semibold">Transport</th>
                  <th className="px-5 py-4 font-semibold">Rate / Kg</th>
                  <th className="px-5 py-4 font-semibold">Capacity</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredOffers.map((offer) => (
                    <tr key={offer.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {offer.offer_type || 'Shipping Offer'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {offer.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {offer.origin || '—'} → {offer.destination || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {offer.company_name || offer.provider_name || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {offer.provider_email || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                          {formatStatus(offer.mode)}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatPrice(offer.rate_per_kg)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <p>
                          Max: {formatNumber(offer.max_weight_kg, 'kg')}
                        </p>
                        <p className="mt-1 text-xs">
                          Available: {formatNumber(offer.available_space, 'kg')}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[
                              String(offer.status || '').toLowerCase()
                            ] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {formatStatus(offer.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openOffer(offer)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredOffers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {offers.length === 0
                        ? 'No shipping offers have been registered yet.'
                        : 'No offers match your current search and filters.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading shipping offers...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedOffer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedOffer(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="offer-dialog-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Shipping Offer Details
                  </p>
                  <h2
                    id="offer-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    {selectedOffer.offer_type || `Offer #${selectedOffer.id}`}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  aria-label="Close offer details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading offer details...
                </p>
              ) : detailsError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {detailsError}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {detailRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="break-words text-sm font-semibold sm:text-right">
                        {value ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Offer details are read-only because the current admin API
                supports listing and viewing offers, but does not provide
                approval, status-update, or deletion endpoints.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
