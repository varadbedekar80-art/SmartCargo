

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700',
  Requested: 'bg-blue-50 text-blue-700',
  'In Transit': 'bg-violet-50 text-violet-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
}

function getShipmentStatus(status) {
  const value = String(status || 'Pending')
    .replaceAll('_', ' ')
    .toLowerCase()

  const statuses = {
    pending: 'Pending',
    requested: 'Requested',
    in_transit: 'In Transit',
    'in transit': 'In Transit',
    shipped: 'In Transit',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    canceled: 'Cancelled',
  }

  return statuses[value] || value.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '—'

  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function normalizeShipment(shipment) {
  const id = shipment.id ?? shipment.shipment_id ?? '—'
  const cargoSnapshot = shipment.cargo_snapshot

  let cargo = shipment.cargo_name ?? shipment.cargo ?? 'Cargo details unavailable'

  if (typeof cargoSnapshot === 'string') {
    try {
      const parsed = JSON.parse(cargoSnapshot)
      cargo =
        parsed.cargoName ??
        parsed.name ??
        parsed.cargo_name ??
        cargo
    } catch {
      cargo = cargoSnapshot || cargo
    }
  } else if (cargoSnapshot && typeof cargoSnapshot === 'object') {
    cargo =
      cargoSnapshot.cargoName ??
      cargoSnapshot.name ??
      cargoSnapshot.cargo_name ??
      cargo
  }

  return {
    ...shipment,
    id,
    cargo,
    origin: shipment.origin ?? '—',
    destination: shipment.destination ?? '—',
    mode: shipment.mode ?? shipment.transport_mode ?? '—',
    date: shipment.created_at ?? shipment.date ?? shipment.createdAt,
    status: getShipmentStatus(shipment.status),
    amount: formatAmount(
      shipment.estimated_price ?? shipment.confirmed_price ?? shipment.amount,
    ),
  }
}

export default function MyShipments({ onNavigate }) {
  const [shipments, setShipments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/shipments')
      const rows = Array.isArray(result.shipments)
        ? result.shipments
        : Array.isArray(result.data)
          ? result.data
          : []

      setShipments(rows.map(normalizeShipment))
    } catch (err) {
      setError(err.message || 'Unable to load your shipments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      const matchesSearch = [
        shipment.id,
        shipment.cargo,
        shipment.origin,
        shipment.destination,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'All' || shipment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [shipments, search, statusFilter])

  const statusOptions = [
    'All',
    'Pending',
    'Requested',
    'In Transit',
    'Delivered',
    'Cancelled',
  ]

  const stats = [
    {
      label: 'Total Shipments',
      value: shipments.length,
      icon: '📦',
    },
    {
      label: 'Pending',
      value: shipments.filter((shipment) =>
        ['Pending', 'Requested'].includes(shipment.status),
      ).length,
      icon: '⏳',
    },
    {
      label: 'In Transit',
      value: shipments.filter((shipment) => shipment.status === 'In Transit').length,
      icon: '🚚',
    },
    {
      label: 'Delivered',
      value: shipments.filter((shipment) => shipment.status === 'Delivered').length,
      icon: '✓',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Business User / Shipments
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              My Shipments
            </h1>
            <p className="mt-2 text-slate-600">
              View, search, and manage your shipment requests.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadShipments}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('Create Shipment')}
              className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              + Create Shipment
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          >
            <p className="font-semibold">Unable to load shipments</p>
            <p className="mt-1 text-sm">{error}</p>
            <button
              type="button"
              onClick={loadShipments}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-extrabold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex-1">
              <label
                htmlFor="shipmentSearch"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search shipments
              </label>
              <input
                id="shipmentSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ID, cargo, origin, or destination..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="w-full lg:w-56">
              <label
                htmlFor="statusFilter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Filter by status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">Shipment</th>
                  <th className="px-4 py-4 font-semibold">Cargo</th>
                  <th className="px-4 py-4 font-semibold">Route</th>
                  <th className="px-4 py-4 font-semibold">Transport</th>
                  <th className="px-4 py-4 font-semibold">Date</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      Loading shipments…
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredShipments.map((shipment) => (
                    <tr
                      key={shipment.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-5 font-bold text-blue-700">
                        {shipment.id}
                      </td>
                      <td className="px-4 py-5 font-medium">
                        {shipment.cargo}
                        <p className="mt-1 text-xs text-slate-500">
                          {shipment.amount}
                        </p>
                      </td>
                      <td className="px-4 py-5">
                        <p>{shipment.origin}</p>
                        <p className="my-1 text-xs text-slate-400">↓</p>
                        <p>{shipment.destination}</p>
                      </td>
                      <td className="px-4 py-5">{shipment.mode}</td>
                      <td className="whitespace-nowrap px-4 py-5">
                        {formatDate(shipment.date)}
                      </td>
                      <td className="px-4 py-5">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            statusStyles[shipment.status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {shipment.status}
                        </span>
                      </td>
                      <td className="px-4 py-5">
                        <button
                          type="button"
                          onClick={() => setSelectedShipment(shipment)}
                          className="font-semibold text-blue-700 hover:text-blue-900"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredShipments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      {shipments.length === 0
                        ? 'You have no shipments yet. Create a shipment request to get started.'
                        : 'No shipments match your search or selected filter.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 text-sm text-slate-500">
            Showing {loading ? '…' : filteredShipments.length} of {shipments.length} shipments
          </div>
        </div>

        {selectedShipment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={() => setSelectedShipment(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="shipmentDialogTitle"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Shipment details
                  </p>
                  <h2
                    id="shipmentDialogTitle"
                    className="mt-1 text-2xl font-bold"
                  >
                    {selectedShipment.id}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  aria-label="Close shipment details"
                  className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                {[
                  ['Cargo', selectedShipment.cargo],
                  ['Origin', selectedShipment.origin],
                  ['Destination', selectedShipment.destination],
                  ['Transport mode', selectedShipment.mode],
                  ['Shipment date', formatDate(selectedShipment.date)],
                  ['Estimated amount', selectedShipment.amount],
                  ['Current status', selectedShipment.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-slate-100 pb-3"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="text-right font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedShipment(null)}
                  className="rounded-xl bg-blue-700 px-5 py-2.5 font-semibold text-white hover:bg-blue-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Smart Cargo Export & Logistics Management System
        </p>
      </div>
    </div>
  )
}
