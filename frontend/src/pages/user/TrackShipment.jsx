
import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

const formatPriceDate = (date) => {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) return 'Not available'

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getStatus = (status) => {
  const value = String(status || 'pending')
    .toLowerCase()
    .replace(/[_-]/g, ' ')

  if (value.includes('deliver')) return 'Delivered'
  if (value.includes('transit') || value.includes('dispatch')) {
    return 'In Transit'
  }
  if (value.includes('cancel')) return 'Cancelled'
  if (value.includes('confirm') || value.includes('accept')) {
    return 'Confirmed'
  }

  return 'Pending'
}

const statusStyles = {
  Pending: 'bg-amber-50 text-amber-700',
  Confirmed: 'bg-indigo-50 text-indigo-700',
  'In Transit': 'bg-blue-50 text-blue-700',
  Delivered: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-700',
}

const getCargoName = (shipment) => {
  let cargo = shipment.cargo_snapshot || shipment.cargo

  if (typeof cargo === 'string') {
    try {
      cargo = JSON.parse(cargo)
    } catch {
      return cargo || 'Cargo details unavailable'
    }
  }

  return (
    cargo?.name ||
    shipment.cargo_name ||
    shipment.cargoName ||
    'Cargo details unavailable'
  )
}

const getTrackingId = (shipment) =>
  shipment.tracking_number ||
  shipment.trackingNumber ||
  shipment.shipment_number ||
  shipment.shipmentNumber ||
  shipment.id

const getMode = (shipment) =>
  shipment.mode ||
  shipment.transport_mode ||
  shipment.transportMode ||
  'Not specified'

const getProgress = (status) => {
  switch (status) {
    case 'Confirmed':
      return 20
    case 'In Transit':
      return 60
    case 'Delivered':
      return 100
    case 'Cancelled':
      return 0
    default:
      return 5
  }
}

export default function TrackShipment() {
  const [shipments, setShipments] = useState([])
  const [trackingId, setTrackingId] = useState('')
  const [shipment, setShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [error, setError] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    async function loadShipments() {
      setLoading(true)
      setLoadError('')

      try {
        const result = await apiRequest('/shipments')

        if (active) {
          setShipments(Array.isArray(result.shipments) ? result.shipments : [])
        }
      } catch (err) {
        if (active) {
          setLoadError(err.message || 'Unable to load your shipments.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadShipments()

    return () => {
      active = false
    }
  }, [])

  const handleTrack = async (event) => {
    event.preventDefault()

    const query = trackingId.trim()

    if (!query) {
      setShipment(null)
      setError('Please enter a shipment ID or tracking number.')
      return
    }

    setTracking(true)
    setError('')
    setShipment(null)

    try {
      const match = shipments.find((item) =>
        String(getTrackingId(item)).toLowerCase() === query.toLowerCase()
      )

      if (!match) {
        setError(
          'No matching shipment was found in your account. Check the shipment ID and try again.'
        )
        return
      }

      // Fetch the latest details for the selected shipment.
      const result = await apiRequest(`/shipments/${match.id}`)
      setShipment(result.shipment || match)
    } catch (err) {
      setError(err.message || 'Unable to retrieve shipment details.')
    } finally {
      setTracking(false)
    }
  }

  const normalizedStatus = shipment ? getStatus(shipment.status) : 'Pending'
  const progress = shipment ? getProgress(normalizedStatus) : 0

  const history = shipment
    ? [
        {
          title: 'Shipment request created',
          date: shipment.created_at || shipment.createdAt,
          location: shipment.origin || 'Origin not specified',
          completed: true,
        },
        ...(normalizedStatus === 'Confirmed' ||
        normalizedStatus === 'In Transit' ||
        normalizedStatus === 'Delivered'
          ? [
              {
                title: 'Shipment confirmed',
                date: null,
                location: 'Confirmation date not provided by the backend',
                completed: true,
              },
            ]
          : []),
        ...(normalizedStatus === 'In Transit' ||
        normalizedStatus === 'Delivered'
          ? [
              {
                title: 'In transit',
                date: null,
                location: 'Live tracking location not available',
                completed: true,
              },
            ]
          : []),
        ...(normalizedStatus === 'Delivered'
          ? [
              {
                title: 'Delivered',
                date: null,
                location: shipment.destination || 'Destination not specified',
                completed: true,
              },
            ]
          : []),
      ]
    : []

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Business User / Tracking
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Track Shipment
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Search your shipments to view their latest recorded status, route,
            transport mode, and available shipment history.
          </p>
        </div>

        <div className="mt-7 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 p-6 text-white shadow-sm sm:p-9">
          <div className="text-3xl" aria-hidden="true">
            📍
          </div>
          <h2 className="mt-4 text-2xl font-bold">
            Where is your shipment?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">
            Enter a shipment ID or tracking number belonging to your account.
          </p>

          <form
            onSubmit={handleTrack}
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="trackingId" className="sr-only">
              Shipment ID or tracking number
            </label>
            <input
              id="trackingId"
              value={trackingId}
              onChange={(event) => {
                setTrackingId(event.target.value)
                setError('')
              }}
              placeholder="Enter shipment ID or tracking number"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white px-4 py-3.5 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-blue-300"
            />
            <button
              type="submit"
              disabled={loading || tracking}
              className="rounded-xl bg-blue-500 px-7 py-3.5 font-bold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {tracking ? 'Searching...' : 'Track Shipment →'}
            </button>
          </form>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-100"
            >
              {error}
            </p>
          )}

          {loading && (
            <p className="mt-4 text-sm text-blue-100">
              Loading your shipments...
            </p>
          )}

          {loadError && (
            <div
              role="alert"
              className="mt-4 rounded-xl bg-red-500/15 p-3 text-sm text-red-100"
            >
              {loadError}
            </div>
          )}

          {!loading && !loadError && shipments.length === 0 && (
            <p className="mt-4 text-sm text-blue-100">
              You do not have any shipments available to track yet.
            </p>
          )}
        </div>

        {shipment && (
          <div className="mt-7 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm text-slate-500">
                    Shipment / tracking number
                  </p>
                  <h2 className="mt-1 break-all text-2xl font-extrabold">
                    {getTrackingId(shipment)}
                  </h2>
                  <p className="mt-2 text-slate-600">
                    {getCargoName(shipment)}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${
                    statusStyles[normalizedStatus] ||
                    'bg-slate-100 text-slate-700'
                  }`}
                >
                  {normalizedStatus}
                </span>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Origin</p>
                  <p className="mt-2 font-bold">
                    {shipment.origin || 'Not specified'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Destination
                  </p>
                  <p className="mt-2 font-bold">
                    {shipment.destination || 'Not specified'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Transport mode
                  </p>
                  <p className="mt-2 font-bold">{getMode(shipment)}</p>
                </div>
              </div>

              <div className="mt-7">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold">Status progress</span>
                  <span className="font-bold text-blue-700">{progress}%</span>
                </div>

                <div
                  className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Status-based shipment progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  This is an indicative status-based progress level, not live
                  GPS tracking.
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Request created</p>
                <p className="mt-1 font-bold text-blue-950">
                  {formatPriceDate(
                    shipment.created_at || shipment.createdAt
                  )}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-bold">Available Shipment History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Based on the shipment status currently recorded by the backend.
              </p>

              <div className="mt-7">
                {history.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="relative flex gap-4 pb-7 last:pb-0"
                  >
                    {index !== history.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-8 h-full w-0.5 ${
                          item.completed ? 'bg-blue-500' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      ✓
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <h3 className="font-bold text-slate-900">
                          {item.title}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {item.date
                            ? formatPriceDate(item.date)
                            : 'Date not recorded'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                Detailed checkpoints, estimated delivery dates, and live
                location updates will appear here once those records are
                supported by the backend.
              </div>
            </section>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Smart Cargo Export & Logistics Management System
        </p>
      </div>
    </div>
  )
}
