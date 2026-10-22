
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Accepted',
  rejected: 'Rejected',
  picked_up: 'Picked Up',
  in_transit: 'In Transit',
  delivered: 'Delivered',
}

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  picked_up: 'bg-violet-50 text-violet-700',
  in_transit: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
}

const progressValues = {
  pending: 0,
  confirmed: 10,
  picked_up: 25,
  in_transit: 60,
  delivered: 100,
  rejected: 0,
}

const statusOptions = [
  { value: 'confirmed', label: 'Accepted' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'rejected', label: 'Rejected' },
]

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  const amount = Number(value)

  if (!Number.isFinite(amount)) return 'Not available'

  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

function getCargoDetails(shipment) {
  const cargo = shipment.cargo_snapshot

  if (!cargo) {
    return {
      name: 'Cargo details unavailable',
      weight: 'Not available',
      quantity: 'Not available',
      description: '',
    }
  }

  return {
    name: cargo.name || 'Unnamed cargo',
    weight:
      cargo.weight_kg !== null && cargo.weight_kg !== undefined
        ? `${cargo.weight_kg} kg`
        : 'Not available',
    quantity:
      cargo.quantity !== null && cargo.quantity !== undefined
        ? cargo.quantity
        : 'Not available',
    description: cargo.description || '',
  }
}

export default function ActiveShipments() {
  const [shipments, setShipments] = useState([])
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/provider/shipments')
      setShipments(response.shipments || [])
    } catch (err) {
      setError(err.message || 'Unable to load shipments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return shipments.filter((shipment) => {
      const cargo = getCargoDetails(shipment)

      const matchesSearch =
        !query ||
        String(shipment.id).toLowerCase().includes(query) ||
        String(shipment.user_id).toLowerCase().includes(query) ||
        cargo.name.toLowerCase().includes(query) ||
        String(shipment.origin || '').toLowerCase().includes(query) ||
        String(shipment.destination || '').toLowerCase().includes(query)

      const matchesMode =
        modeFilter === 'All' ||
        String(shipment.mode || '').toLowerCase() ===
          modeFilter.toLowerCase()

      const matchesStatus =
        statusFilter === 'All' || shipment.status === statusFilter

      return matchesSearch && matchesMode && matchesStatus
    })
  }, [shipments, search, modeFilter, statusFilter])

  const activeCount = shipments.filter((shipment) =>
    ['confirmed', 'picked_up', 'in_transit'].includes(shipment.status),
  ).length

  const transitCount = shipments.filter((shipment) =>
    ['picked_up', 'in_transit'].includes(shipment.status),
  ).length

  const deliveredCount = shipments.filter(
    (shipment) => shipment.status === 'delivered',
  ).length

  const stats = [
    {
      title: 'Total Shipments',
      value: shipments.length,
      icon: '📦',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Active Shipments',
      value: activeCount,
      icon: '🚚',
      color: 'bg-violet-50 text-violet-700',
    },
    {
      title: 'Currently Moving',
      value: transitCount,
      icon: '📍',
      color: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Delivered',
      value: deliveredCount,
      icon: '✅',
      color: 'bg-emerald-50 text-emerald-700',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Operations
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Active Shipments
            </h1>
            <p className="mt-2 text-slate-600">
              Monitor accepted cargo shipments and track their delivery
              progress.
            </p>
          </div>

          <button
            type="button"
            onClick={loadShipments}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={loadShipments}
              className="self-start font-semibold hover:underline sm:self-auto"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
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
              <p className="mt-4 text-3xl font-extrabold">{stat.value}</p>
            </div>
          ))}
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <div>
            <h2 className="text-lg font-bold">Shipment Register</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search shipments and filter by transport mode or status.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search shipment, customer ID or cargo..."
              aria-label="Search shipments"
              className={inputClass}
            />

            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value)}
              aria-label="Filter by transport mode"
              className={inputClass}
            >
              <option value="All">All transport modes</option>
              <option value="air">Air</option>
              <option value="sea">Sea</option>
              <option value="road">Road</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by shipment status"
              className={inputClass}
            >
              <option value="All">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
              <option value="pending">Pending</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <p className="font-semibold text-slate-700">
                Loading shipments...
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Retrieving shipment information from the server.
              </p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl">📦</div>
              <p className="mt-3 font-semibold">No shipments found</p>
              <p className="mt-2 text-sm text-slate-500">
                Try changing your search or filters, or refresh the list.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredShipments.map((shipment) => {
                const cargo = getCargoDetails(shipment)
                const progress = progressValues[shipment.status] ?? 0
                const statusLabel =
                  statusLabels[shipment.status] || shipment.status

                return (
                  <article
                    key={shipment.id}
                    className="rounded-2xl border border-slate-200 p-5 transition hover:border-blue-200"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-extrabold">
                            Shipment #{shipment.id}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                              statusStyles[shipment.status] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-slate-700">
                          Customer ID: {shipment.user_id}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {cargo.name} · {cargo.weight}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-700">
                          {shipment.mode || 'Unknown'} Freight
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedShipment(shipment)}
                          className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Origin
                        </p>
                        <p className="mt-2 font-semibold">
                          {shipment.origin || 'Not available'}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Destination
                        </p>
                        <p className="mt-2 font-semibold">
                          {shipment.destination || 'Not available'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold">
                          Shipment progress
                        </span>
                        <span className="font-bold text-blue-700">
                          {progress}%
                        </span>
                      </div>

                      <div
                        className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        aria-label={`Progress for shipment ${shipment.id}`}
                        aria-valuenow={progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                        <span>
                          Created: {formatDate(shipment.created_at)}
                        </span>
                        <span>
                          Estimated price:{' '}
                          {formatMoney(shipment.estimated_price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedShipment(shipment)}
                        className="text-left text-sm font-semibold text-blue-700 hover:text-blue-900 sm:text-right"
                      >
                        View shipment details →
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {selectedShipment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onClick={() => setSelectedShipment(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="shipment-dialog-title"
              className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
              {(() => {
                const cargo = getCargoDetails(selectedShipment)

                return (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-blue-700">
                          Shipment #{selectedShipment.id}
                        </p>
                        <h2
                          id="shipment-dialog-title"
                          className="mt-1 text-2xl font-extrabold"
                        >
                          Shipment Details
                        </h2>
                      </div>

                      <button
                        type="button"
                        aria-label="Close shipment details"
                        onClick={() => setSelectedShipment(null)}
                        className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100"
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-6 space-y-3">
                      {[
                        ['Customer ID', selectedShipment.user_id],
                        ['Cargo', cargo.name],
                        ['Description', cargo.description || 'Not provided'],
                        ['Weight', cargo.weight],
                        ['Quantity', cargo.quantity],
                        ['Origin', selectedShipment.origin],
                        ['Destination', selectedShipment.destination],
                        [
                          'Transport mode',
                          selectedShipment.mode?.toUpperCase(),
                        ],
                        [
                          'Status',
                          statusLabels[selectedShipment.status] ||
                            selectedShipment.status,
                        ],
                        [
                          'Created date',
                          formatDate(selectedShipment.created_at),
                        ],
                        [
                          'Quoted rate',
                          formatMoney(selectedShipment.quoted_rate),
                        ],
                        [
                          'Estimated price',
                          formatMoney(selectedShipment.estimated_price),
                        ],
                        [
                          'Confirmed price',
                          formatMoney(selectedShipment.confirmed_price),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="flex flex-col justify-between gap-1 border-b border-slate-100 py-3 sm:flex-row sm:gap-4"
                        >
                          <span className="text-sm text-slate-500">
                            {label}
                          </span>
                          <span className="break-words text-sm font-semibold sm:text-right">
                            {value === null ||
                            value === undefined ||
                            value === ''
                              ? 'Not available'
                              : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedShipment(null)}
                        className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        Close
                      </button>
                    </div>
                  </>
                )
              })()}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
