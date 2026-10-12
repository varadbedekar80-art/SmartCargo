
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'

const statusInfo = {
  pending: {
    label: 'New',
    style: 'bg-blue-50 text-blue-700',
  },
  confirmed: {
    label: 'Accepted',
    style: 'bg-emerald-50 text-emerald-700',
  },
  rejected: {
    label: 'Rejected',
    style: 'bg-red-50 text-red-700',
  },
  picked_up: {
    label: 'Picked Up',
    style: 'bg-violet-50 text-violet-700',
  },
  in_transit: {
    label: 'In Transit',
    style: 'bg-amber-50 text-amber-700',
  },
  delivered: {
    label: 'Delivered',
    style: 'bg-emerald-50 text-emerald-700',
  },
}

function normaliseStatus(status) {
  return String(status || '').toLowerCase()
}

function formatMode(mode) {
  const modes = {
    air: 'Air',
    sea: 'Sea',
    road: 'Road',
  }

  return modes[normaliseStatus(mode)] || mode || '—'
}

function formatDate(dateValue) {
  if (!dateValue) return '—'

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—'

  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'

  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '—'

  const number = Number(value)
  if (!Number.isFinite(number)) return '—'

  return number.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })
}

function getCargo(request) {
  if (request.cargo_snapshot && typeof request.cargo_snapshot === 'object') {
    return request.cargo_snapshot
  }

  if (typeof request.cargo_snapshot === 'string') {
    try {
      return JSON.parse(request.cargo_snapshot)
    } catch {
      return {}
    }
  }

  return {}
}

function getCargoName(request) {
  const cargo = getCargo(request)
  return cargo.name || cargo.cargo_name || 'Cargo details unavailable'
}

function getCargoWeight(request) {
  const cargo = getCargo(request)
  const weight = Number(cargo.weight_kg)

  if (!Number.isFinite(weight) || weight <= 0) return '—'

  return `${formatNumber(weight)} kg`
}

function getCargoQuantity(request) {
  const cargo = getCargo(request)
  const quantity = cargo.quantity

  return quantity === null || quantity === undefined || quantity === ''
    ? '—'
    : formatNumber(quantity)
}

function getCargoDescription(request) {
  const cargo = getCargo(request)
  return cargo.description || 'No additional cargo description provided.'
}

function getStatusInfo(status) {
  return (
    statusInfo[normaliseStatus(status)] || {
      label: String(status || 'Unknown').replaceAll('_', ' '),
      style: 'bg-slate-100 text-slate-700',
    }
  )
}

export default function ShipmentRequests() {
  const [requests, setRequests] = useState([])
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const data = await apiRequest('/provider/shipments')
      const shipmentList = Array.isArray(data.shipments) ? data.shipments : []

      setRequests(shipmentList)

      setSelectedRequest((previous) => {
        if (!previous) return null

        return (
          shipmentList.find(
            (request) => String(request.id) === String(previous.id),
          ) || null
        )
      })
    } catch (error) {
      setLoadError(error.message || 'Unable to load shipment requests.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
  }, [loadRequests])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()

    return requests.filter((request) => {
      const cargo = getCargo(request)
      const id = String(request.id ?? '')
      const userId = String(request.user_id ?? '')
      const cargoName = getCargoName(request)
      const origin = String(request.origin || '')
      const destination = String(request.destination || '')
      const mode = formatMode(request.mode)
      const status = normaliseStatus(request.status)

      const matchesSearch =
        !query ||
        id.toLowerCase().includes(query) ||
        userId.toLowerCase().includes(query) ||
        cargoName.toLowerCase().includes(query) ||
        origin.toLowerCase().includes(query) ||
        destination.toLowerCase().includes(query) ||
        String(cargo.description || '').toLowerCase().includes(query)

      const matchesMode = modeFilter === 'All' || mode === modeFilter
      const matchesStatus =
        statusFilter === 'All' || status === statusFilter

      return matchesSearch && matchesMode && matchesStatus
    })
  }, [requests, search, modeFilter, statusFilter])

  const pendingCount = requests.filter(
    (request) => normaliseStatus(request.status) === 'pending',
  ).length

  const acceptedCount = requests.filter(
    (request) => normaliseStatus(request.status) === 'confirmed',
  ).length

  const rejectedCount = requests.filter(
    (request) => normaliseStatus(request.status) === 'rejected',
  ).length

  const respondToRequest = async (request, decision) => {
    if (normaliseStatus(request.status) !== 'pending') {
      setFeedbackType('error')
      setFeedback('This request has already been processed.')
      return
    }

    setFeedback('')
    setProcessingId(request.id)

    try {
      const data = await apiRequest(
        `/provider/shipments/${request.id}/respond`,
        {
          method: 'PATCH',
          body: JSON.stringify({ decision }),
        },
      )

      setFeedbackType('success')
      setFeedback(
        data.message ||
          (decision === 'accept'
            ? 'Shipment request accepted successfully.'
            : 'Shipment request rejected successfully.'),
      )

      setSelectedRequest(null)
      await loadRequests()
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Unable to process the shipment request.')
      await loadRequests()
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Operations
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Shipment Requests
            </h1>
            <p className="mt-2 text-slate-600">
              Review customer cargo requirements and respond to incoming shipment requests.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : '↻ Refresh Requests'}
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
              onClick={loadRequests}
              className="mt-2 font-semibold underline"
            >
              Retry loading requests
            </button>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: 'Total Requests',
              value: requests.length,
              icon: '📦',
              color: 'bg-blue-50 text-blue-700',
            },
            {
              title: 'New Requests',
              value: pendingCount,
              icon: '📥',
              color: 'bg-indigo-50 text-indigo-700',
            },
            {
              title: 'Accepted',
              value: acceptedCount,
              icon: '✅',
              color: 'bg-emerald-50 text-emerald-700',
            },
            {
              title: 'Rejected',
              value: rejectedCount,
              icon: '↩️',
              color: 'bg-red-50 text-red-700',
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
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${stat.color}`}
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
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="text-lg font-bold">Incoming Requests</h2>
              <p className="mt-1 text-sm text-slate-500">
                These requests are loaded from your provider account.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:w-3/4">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests..."
                aria-label="Search shipment requests"
                className={inputClass}
              />

              <select
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                aria-label="Filter by transport mode"
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
                aria-label="Filter by request status"
                className={inputClass}
              >
                <option value="All">All statuses</option>
                <option value="pending">New / Pending</option>
                <option value="confirmed">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="picked_up">Picked Up</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-4 font-semibold">Shipment / Customer</th>
                  <th className="px-4 py-4 font-semibold">Route</th>
                  <th className="px-4 py-4 font-semibold">Cargo</th>
                  <th className="px-4 py-4 font-semibold">Mode</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {!loading &&
                  filteredRequests.map((request) => {
                    const status = getStatusInfo(request.status)

                    return (
                      <tr
                        key={request.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold">Shipment #{request.id}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Customer ID: {request.user_id ?? '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(request.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{request.origin || '—'}</p>
                          <p className="my-1 text-xs text-blue-700">↓ Destination</p>
                          <p>{request.destination || '—'}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{getCargoName(request)}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getCargoWeight(request)}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {formatMode(request.mode)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${status.style}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequest(request)
                              setFeedback('')
                            }}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {loading && (
              <div className="py-12 text-center text-sm text-slate-500">
                Loading shipment requests…
              </div>
            )}

            {!loading && !loadError && filteredRequests.length === 0 && (
              <div className="py-12 text-center">
                <p className="font-semibold text-slate-700">
                  No matching requests found
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {requests.length === 0
                    ? 'New shipment requests associated with your offers will appear here.'
                    : 'Try changing the search term or filters.'}
                </p>
              </div>
            )}
          </div>
        </section>

        {selectedRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onClick={() => {
              if (processingId === null) setSelectedRequest(null)
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="request-dialog-title"
              className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Shipment #{selectedRequest.id}
                  </p>
                  <h2
                    id="request-dialog-title"
                    className="mt-1 text-2xl font-extrabold"
                  >
                    Request Details
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Requested on {formatDate(selectedRequest.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close request details"
                  disabled={processingId !== null}
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  ['Customer ID', selectedRequest.user_id ?? '—'],
                  ['Offer ID', selectedRequest.offer_id ?? '—'],
                  ['Cargo', getCargoName(selectedRequest)],
                  ['Transport mode', formatMode(selectedRequest.mode)],
                  ['Origin', selectedRequest.origin || '—'],
                  ['Destination', selectedRequest.destination || '—'],
                  ['Weight', getCargoWeight(selectedRequest)],
                  ['Quantity', getCargoQuantity(selectedRequest)],
                  ['Estimated price', formatMoney(selectedRequest.estimated_price)],
                  ['Confirmed price', formatMoney(selectedRequest.confirmed_price)],
                  ['Quoted rate per kg', formatMoney(selectedRequest.quoted_rate)],
                  ['Status', getStatusInfo(selectedRequest.status).label],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold">Cargo description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {getCargoDescription(selectedRequest)}
                </p>
              </div>

              {normaliseStatus(selectedRequest.status) === 'pending' ? (
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => respondToRequest(selectedRequest, 'reject')}
                    disabled={processingId !== null}
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === selectedRequest.id
                      ? 'Processing…'
                      : 'Reject Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => respondToRequest(selectedRequest, 'accept')}
                    disabled={processingId !== null}
                    className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === selectedRequest.id
                      ? 'Processing…'
                      : 'Accept Request'}
                  </button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    This request has already been processed.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        <p className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Backend connected:</strong> Requests are loaded from your
          provider account. Accepting or rejecting a pending request sends the
          decision to the backend, which is responsible for updating the
          shipment and associated records.
        </p>
      </div>
    </div>
  )
}
