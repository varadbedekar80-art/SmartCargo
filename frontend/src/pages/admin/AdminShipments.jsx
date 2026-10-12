
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-700',
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

function formatMoney(value) {
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

function getCargoLabel(snapshot) {
  if (!snapshot) return '—'

  if (typeof snapshot === 'string') {
    try {
      const parsed = JSON.parse(snapshot)
      return getCargoLabel(parsed)
    } catch {
      return snapshot
    }
  }

  if (typeof snapshot === 'object') {
    return (
      snapshot.name ||
      snapshot.cargo_name ||
      snapshot.type ||
      snapshot.description ||
      snapshot.product_name ||
      'Cargo details available'
    )
  }

  return String(snapshot)
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadShipments() {
      setLoading(true)
      setError('')

      try {
        const data = await apiRequest('/admin/shipments')

        if (!data.success) {
          throw new Error(data.message || 'Failed to load shipments.')
        }

        if (!cancelled) {
          setShipments(data.shipments || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load shipments.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadShipments()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const countStatus = (status) =>
      shipments.filter(
        (shipment) =>
          String(shipment.status || '').toLowerCase() === status,
      ).length

    return {
      total: shipments.length,
      pending: countStatus('pending'),
      confirmed: countStatus('confirmed'),
      delivered: countStatus('delivered'),
    }
  }, [shipments])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return shipments.filter((shipment) => {
      const cargo = getCargoLabel(shipment.cargo_snapshot)
      const route = `${shipment.origin || ''} ${shipment.destination || ''}`

      const matchesSearch =
        !query ||
        [
          shipment.id,
          shipment.business_user_name,
          shipment.business_user_email,
          shipment.provider_company,
          cargo,
          route,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query),
        )

      const matchesStatus =
        statusFilter === 'All' ||
        String(shipment.status || '').toLowerCase() ===
          statusFilter.toLowerCase()

      const matchesMode =
        modeFilter === 'All' ||
        String(shipment.mode || '').toLowerCase() ===
          modeFilter.toLowerCase()

      return matchesSearch && matchesStatus && matchesMode
    })
  }, [shipments, search, statusFilter, modeFilter])

  const statuses = useMemo(
    () =>
      [...new Set(shipments.map((item) => item.status).filter(Boolean))],
    [shipments],
  )

  const modes = useMemo(
    () =>
      [...new Set(shipments.map((item) => item.mode).filter(Boolean))],
    [shipments],
  )

  async function openShipment(shipment) {
    setSelectedShipment(shipment)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const data = await apiRequest(`/admin/shipments/${shipment.id}`)

      if (!data.success || !data.shipment) {
        throw new Error(data.message || 'Failed to load shipment details.')
      }

      setSelectedShipment(data.shipment)
    } catch (err) {
      setDetailsError(err.message || 'Unable to load shipment details.')
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportCSV() {
    const columns = [
      ['id', 'Shipment ID'],
      ['business_user_name', 'Exporter'],
      ['business_user_email', 'Exporter Email'],
      ['provider_company', 'Provider'],
      ['cargo_snapshot', 'Cargo'],
      ['origin', 'Origin'],
      ['destination', 'Destination'],
      ['mode', 'Transport Mode'],
      ['status', 'Status'],
      ['estimated_price', 'Estimated Price'],
      ['confirmed_price', 'Confirmed Price'],
      ['created_at', 'Created Date'],
    ]

    const escapeCSV = (value) =>
      `"${String(value ?? '').replaceAll('"', '""')}"`

    const rows = [
      columns.map(([, label]) => escapeCSV(label)).join(','),
      ...filteredShipments.map((shipment) =>
        columns
          .map(([key]) => {
            const value =
              key === 'cargo_snapshot'
                ? getCargoLabel(shipment.cargo_snapshot)
                : key === 'estimated_price' || key === 'confirmed_price'
                  ? shipment[key] ?? ''
                  : shipment[key]

            return escapeCSV(value)
          })
          .join(','),
      ),
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smart-cargo-shipments.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const detailRows = selectedShipment
    ? [
        ['Shipment ID', selectedShipment.id],
        ['Exporter', selectedShipment.business_user_name],
        ['Exporter Email', selectedShipment.business_user_email],
        ['Provider', selectedShipment.provider_company],
        ['Cargo', getCargoLabel(selectedShipment.cargo_snapshot)],
        ['Origin', selectedShipment.origin],
        ['Destination', selectedShipment.destination],
        ['Transport Mode', selectedShipment.mode],
        ['Quoted Rate', formatMoney(selectedShipment.quoted_rate)],
        ['Estimated Price', formatMoney(selectedShipment.estimated_price)],
        ['Confirmed Price', formatMoney(selectedShipment.confirmed_price)],
        ['Status', formatStatus(selectedShipment.status)],
        ['Created Date', formatDate(selectedShipment.created_at)],
        ['Confirmed Date', formatDate(selectedShipment.confirmed_at)],
      ]
    : []

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Administration / Operations
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Shipment Management
            </h1>
            <p className="mt-2 text-slate-600">
              Monitor real shipment records and review logistics details.
            </p>
          </div>

          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || Boolean(error) || filteredShipments.length === 0}
            className="w-fit rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Shipments', value: stats.total, icon: '📦' },
            { label: 'Pending', value: stats.pending, icon: '⏳' },
            { label: 'Confirmed', value: stats.confirmed, icon: '🚚' },
            { label: 'Delivered', value: stats.delivered, icon: '✓' },
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
            <h2 className="text-lg font-bold">All Shipments</h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading shipment records...'
                : `${filteredShipments.length} matching shipment${filteredShipments.length === 1 ? '' : 's'}`}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ID, exporter, provider, cargo..."
                aria-label="Search shipments"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter by shipment status"
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
                aria-label="Filter by transport mode"
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
              <p className="font-semibold">Could not load shipments</p>
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
                  <th className="px-5 py-4 font-semibold">Shipment</th>
                  <th className="px-5 py-4 font-semibold">Exporter</th>
                  <th className="px-5 py-4 font-semibold">Provider</th>
                  <th className="px-5 py-4 font-semibold">Route</th>
                  <th className="px-5 py-4 font-semibold">Mode</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{shipment.id}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getCargoLabel(shipment.cargo_snapshot)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {shipment.business_user_name || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {shipment.business_user_email || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {shipment.provider_company || '—'}
                      </td>

                      <td className="px-5 py-4">
                        <p>{shipment.origin || '—'}</p>
                        <p className="my-1 text-xs text-slate-400">to</p>
                        <p>{shipment.destination || '—'}</p>
                      </td>

                      <td className="px-5 py-4">
                        {formatStatus(shipment.mode)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(shipment.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[
                              String(shipment.status || '').toLowerCase()
                            ] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {formatStatus(shipment.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openShipment(shipment)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredShipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {shipments.length === 0
                        ? 'No shipments have been registered yet.'
                        : 'No shipments match your search and filters.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading shipment records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedShipment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedShipment(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="shipment-dialog-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Shipment Details
                  </p>
                  <h2
                    id="shipment-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    Shipment #{selectedShipment.id}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  aria-label="Close shipment details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading shipment details...
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
                        {value || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Shipment status is read-only here because the current admin API
                does not provide a status-update endpoint.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
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
