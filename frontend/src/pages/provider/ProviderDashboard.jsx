
import { useCallback, useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

const quickActions = [
  {
    title: 'Review Requests',
    description: 'Respond to customer shipments',
    menu: 'Shipment Requests',
    icon: '📥',
  },
  {
    title: 'Create an Offer',
    description: 'Publish logistics services',
    menu: 'Manage Offers',
    icon: '🏷️',
  },
  {
    title: 'Update Tracking',
    description: 'Maintain shipment progress',
    menu: 'Tracking Updates',
    icon: '📍',
  },
  {
    title: 'View Invoices',
    description: 'Review billing information',
    menu: 'Invoices',
    icon: '🧾',
  },
]

const statusInfo = {
  pending: { label: 'New Request', style: 'bg-blue-50 text-blue-700' },
  confirmed: { label: 'Accepted', style: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected', style: 'bg-red-50 text-red-700' },
  picked_up: { label: 'Picked Up', style: 'bg-violet-50 text-violet-700' },
  in_transit: { label: 'In Transit', style: 'bg-amber-50 text-amber-700' },
  delivered: { label: 'Delivered', style: 'bg-emerald-50 text-emerald-700' },
}

function normaliseStatus(status) {
  return String(status || '').toLowerCase()
}

function formatMode(mode) {
  const modes = { air: 'Air', sea: 'Sea', road: 'Road' }
  return modes[normaliseStatus(mode)] || mode || '—'
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

function getCargoName(request) {
  let cargo = request.cargo_snapshot

  if (typeof cargo === 'string') {
    try {
      cargo = JSON.parse(cargo)
    } catch {
      cargo = {}
    }
  }

  return cargo?.name || cargo?.cargo_name || 'Cargo details unavailable'
}

function getStatus(status) {
  return (
    statusInfo[normaliseStatus(status)] || {
      label: String(status || 'Unknown').replaceAll('_', ' '),
      style: 'bg-slate-100 text-slate-700',
    }
  )
}

export default function ProviderDashboard({ onNavigate }) {
  const [requests, setRequests] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    const [requestsResult, offersResult] = await Promise.allSettled([
      apiRequest('/provider/shipments'),
      apiRequest('/offers/my'),
    ])

    const errors = []

    if (requestsResult.status === 'fulfilled') {
      setRequests(
        Array.isArray(requestsResult.value.shipments)
          ? requestsResult.value.shipments
          : [],
      )
    } else {
      errors.push('shipment requests')
    }

    if (offersResult.status === 'fulfilled') {
      setOffers(
        Array.isArray(offersResult.value.offers)
          ? offersResult.value.offers
          : [],
      )
    } else {
      errors.push('shipping offers')
    }

    if (errors.length > 0) {
      setError(`Unable to load ${errors.join(' and ')}. Use Refresh to try again.`)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const pendingCount = requests.filter(
    (request) => normaliseStatus(request.status) === 'pending',
  ).length

  const activeShipmentsCount = requests.filter((request) =>
    ['confirmed', 'picked_up', 'in_transit'].includes(
      normaliseStatus(request.status),
    ),
  ).length

  const activeOffersCount = offers.filter(
    (offer) => normaliseStatus(offer.status) === 'active',
  ).length

  const completedCount = requests.filter(
    (request) => normaliseStatus(request.status) === 'delivered',
  ).length

  const stats = [
    {
      title: 'New Requests',
      value: pendingCount,
      note: 'Awaiting your response',
      color: 'bg-blue-50 text-blue-700',
      icon: '📥',
    },
    {
      title: 'Active Shipments',
      value: activeShipmentsCount,
      note: 'Confirmed or in progress',
      color: 'bg-amber-50 text-amber-700',
      icon: '🚚',
    },
    {
      title: 'Active Offers',
      value: activeOffersCount,
      note: 'Available to customers',
      color: 'bg-violet-50 text-violet-700',
      icon: '🏷️',
    },
    {
      title: 'Completed Shipments',
      value: completedCount,
      note: 'Successfully delivered',
      color: 'bg-emerald-50 text-emerald-700',
      icon: '✅',
    },
  ]

  const recentRequests = [...requests]
    .sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime()
      const dateB = new Date(b.created_at || 0).getTime()
      return dateB - dateA
    })
    .slice(0, 5)

  const navigateTo = (page) => {
    if (typeof onNavigate === 'function') {
      onNavigate(page)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 sm:p-6 lg:p-8">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-blue-700">
            Logistics Provider
          </p>
          <h1 className="mt-1 text-2xl font-extrabold">
            Provider Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review your logistics activity and shipment requests.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadDashboard}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('Manage Offers')}
            className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            + Manage Offers
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="self-start font-semibold underline sm:self-auto"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">
                {stat.title}
              </p>
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>

            <p className="mt-4 text-3xl font-extrabold">
              {loading ? '—' : stat.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2 lg:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold">
                Recent Shipment Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                The latest requests associated with your offers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateTo('Shipment Requests')}
              className="text-left text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              View all →
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Shipment</th>
                  <th className="px-3 py-3 font-semibold">Route</th>
                  <th className="px-3 py-3 font-semibold">Mode</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {!loading &&
                  recentRequests.map((request) => {
                    const status = getStatus(request.status)

                    return (
                      <tr
                        key={request.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-3 py-4">
                          <p className="font-semibold">
                            Shipment #{request.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {getCargoName(request)} · {formatDate(request.created_at)}
                          </p>
                        </td>

                        <td className="px-3 py-4 font-medium">
                          <p>{request.origin || '—'}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            ↓ {request.destination || '—'}
                          </p>
                        </td>

                        <td className="px-3 py-4">
                          {formatMode(request.mode)}
                        </td>

                        <td className="px-3 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${status.style}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>

            {loading && (
              <div className="py-10 text-center text-sm text-slate-500">
                Loading dashboard data…
              </div>
            )}

            {!loading && !error && recentRequests.length === 0 && (
              <div className="py-10 text-center text-sm text-slate-500">
                No shipment requests are available yet.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
          <h2 className="text-lg font-bold">Quick Actions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Common provider tasks
          </p>

          <div className="mt-5 space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.menu}
                type="button"
                onClick={() => navigateTo(action.menu)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
              >
                <span className="text-xl">{action.icon}</span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {action.description}
                  </span>
                </span>

                <span className="text-slate-400">→</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
        <strong>Live dashboard:</strong> Statistics and recent requests are
        retrieved from your provider shipment and offer endpoints. The active
        shipment count includes confirmed, picked-up, and in-transit shipments.
      </div>
    </div>
  )
}
