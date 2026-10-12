
import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const milestoneLabels = {
  booking_confirmed: 'Booking Confirmed',
  cargo_picked_up: 'Cargo Picked Up',
  departed: 'Departed',
  in_transit: 'In Transit',
  arrived: 'Arrived',
  customs_clearance: 'Customs Clearance',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  loaded_on_vessel: 'Loaded on Vessel',
  vessel_departed: 'Vessel Departed',
  arrived_at_port: 'Arrived at Port',
  arrived_at_destination: 'Arrived at Destination',
}

const milestonesByMode = {
  air: [
    'booking_confirmed',
    'cargo_picked_up',
    'departed',
    'in_transit',
    'arrived',
    'customs_clearance',
    'out_for_delivery',
    'delivered',
  ],
  sea: [
    'booking_confirmed',
    'cargo_picked_up',
    'loaded_on_vessel',
    'vessel_departed',
    'in_transit',
    'arrived_at_port',
    'customs_clearance',
    'out_for_delivery',
    'delivered',
  ],
  road: [
    'booking_confirmed',
    'cargo_picked_up',
    'in_transit',
    'arrived_at_destination',
    'out_for_delivery',
    'delivered',
  ],
}

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  rejected: 'bg-red-50 text-red-700',
  picked_up: 'bg-violet-50 text-violet-700',
  in_transit: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-emerald-50 text-emerald-700',
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100'

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCargo(shipment) {
  const cargo = shipment.cargo_snapshot

  return {
    name: cargo?.name || 'Cargo details unavailable',
    weight:
      cargo?.weight_kg !== null && cargo?.weight_kg !== undefined
        ? `${cargo.weight_kg} kg`
        : 'Weight unavailable',
    description: cargo?.description || '',
  }
}

function getNextMilestone(mode, history) {
  const allowed = milestonesByMode[String(mode || '').toLowerCase()] || []
  const latest = history[history.length - 1]?.milestone
  const currentIndex = latest ? allowed.indexOf(latest) : -1

  if (currentIndex === -1) {
    return allowed[0] || ''
  }

  return allowed[currentIndex + 1] || ''
}

export default function TrackingUpdates() {
  const [shipments, setShipments] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [historyByShipment, setHistoryByShipment] = useState({})
  const [form, setForm] = useState({
    milestone: '',
    remarks: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const loadShipments = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await apiRequest('/provider/shipments')
      const allShipments = response.shipments || []

      // Only shipments that the backend currently permits tracking.
      const trackableShipments = allShipments.filter((shipment) =>
        ['confirmed', 'picked_up', 'in_transit'].includes(shipment.status),
      )

      setShipments(trackableShipments)

      setSelectedId((currentId) => {
        if (trackableShipments.some((shipment) => String(shipment.id) === currentId)) {
          return currentId
        }

        return trackableShipments.length
          ? String(trackableShipments[0].id)
          : ''
      })
    } catch (err) {
      setError(err.message || 'Unable to load provider shipments.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadShipments()
  }, [loadShipments])

  const selectedShipment =
    shipments.find((shipment) => String(shipment.id) === selectedId) || null

  const selectedHistory = selectedId
    ? historyByShipment[selectedId] || []
    : []

  const allowedMilestones = useMemo(
    () =>
      milestonesByMode[
        String(selectedShipment?.mode || '').toLowerCase()
      ] || [],
    [selectedShipment],
  )

  const nextMilestone = getNextMilestone(
    selectedShipment?.mode,
    selectedHistory,
  )

  useEffect(() => {
    if (!selectedShipment) {
      setForm({ milestone: '', remarks: '' })
      return
    }

    setForm({
      milestone: nextMilestone,
      remarks: '',
    })
  }, [selectedId, selectedShipment?.mode, nextMilestone])

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return shipments.filter((shipment) => {
      const cargo = getCargo(shipment)

      return (
        !query ||
        String(shipment.id).toLowerCase().includes(query) ||
        String(shipment.user_id).toLowerCase().includes(query) ||
        cargo.name.toLowerCase().includes(query) ||
        String(shipment.origin || '').toLowerCase().includes(query) ||
        String(shipment.destination || '').toLowerCase().includes(query)
      )
    })
  }, [shipments, search])

  function handleSelect(id) {
    setSelectedId(String(id))
    setFeedback('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')
    setError('')

    if (!selectedShipment) {
      setError('Select a shipment before adding an update.')
      return
    }

    if (!form.milestone) {
      setError('There are no remaining milestones for this shipment.')
      return
    }

    if (!allowedMilestones.includes(form.milestone)) {
      setError('Choose a valid milestone for this shipment’s transport mode.')
      return
    }

    const remarks = form.remarks.trim()

    if (remarks.length > 1000) {
      setError('Remarks cannot exceed 1000 characters.')
      return
    }

    setSaving(true)

    try {
      const response = await apiRequest(
        `/tracking/${selectedShipment.id}`,
        {
          method: 'POST',
          body: JSON.stringify({
            milestone: form.milestone,
            remarks: remarks || null,
          }),
        },
      )

      const tracking = response.tracking
      const entry = {
        milestone: tracking?.milestone || form.milestone,
        remarks,
        created_at: new Date().toISOString(),
      }

      setHistoryByShipment((previous) => ({
        ...previous,
        [selectedId]: [...(previous[selectedId] || []), entry],
      }))

      setFeedback(
        response.message || 'Tracking update added successfully.',
      )

      // Reload to reflect any overall shipment-status change made by backend.
      await loadShipments()
    } catch (err) {
      setError(err.message || 'Failed to save tracking update.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Logistics Provider / Tracking
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Tracking Updates
            </h1>
            <p className="mt-2 text-slate-600">
              Record valid shipment milestones and keep customers informed.
            </p>
          </div>

          <button
            type="button"
            onClick={loadShipments}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>

        {feedback && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
          >
            {feedback}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <div className="mt-7 grid gap-6 xl:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-bold">Select Shipment</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select one of your accepted or in-progress shipments.
            </p>

            <div className="mt-5">
              <label
                htmlFor="tracking-search"
                className="mb-2 block text-sm font-semibold"
              >
                Search shipments
              </label>
              <input
                id="tracking-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Shipment ID, cargo or customer ID..."
                className={inputClass}
              />
            </div>

            <div className="mt-4 space-y-3">
              {!loading &&
                filteredShipments.map((shipment) => {
                  const cargo = getCargo(shipment)
                  const isSelected = String(shipment.id) === selectedId

                  return (
                    <button
                      key={shipment.id}
                      type="button"
                      onClick={() => handleSelect(shipment.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            Shipment #{shipment.id}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {cargo.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Customer ID: {shipment.user_id}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[shipment.status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {shipment.status.replaceAll('_', ' ')}
                        </span>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {shipment.origin} → {shipment.destination}
                      </p>
                    </button>
                  )
                })}

              {!loading && filteredShipments.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No matching trackable shipments found.
                </p>
              )}

              {loading && (
                <p className="py-8 text-center text-sm text-slate-500">
                  Loading shipments...
                </p>
              )}
            </div>
          </section>

          <div className="space-y-6 xl:col-span-3">
            {selectedShipment ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Shipment #{selectedShipment.id}
                      </p>
                      <h2 className="mt-1 text-xl font-extrabold">
                        Shipment Timeline
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {getCargo(selectedShipment).name}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${
                        statusStyles[selectedShipment.status] ||
                        'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedShipment.status.replaceAll('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Origin
                      </p>
                      <p className="mt-2 font-semibold">
                        {selectedShipment.origin}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Destination
                      </p>
                      <p className="mt-2 font-semibold">
                        {selectedShipment.destination}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Next allowed milestone
                    </p>
                    <p className="mt-2 font-bold text-blue-950">
                      {nextMilestone
                        ? milestoneLabels[nextMilestone] || nextMilestone
                        : 'No further milestones available'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-800">
                      The backend enforces the milestone sequence for this
                      transport mode.
                    </p>
                  </div>

                  <div className="mt-7">
                    <h3 className="font-bold">Updates Submitted This Visit</h3>

                    {selectedHistory.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        No updates have been submitted from this page during
                        the current visit. Existing history is not exposed by
                        the provider API.
                      </p>
                    ) : (
                      <div className="mt-5 space-y-4">
                        {selectedHistory.map((entry, index) => (
                          <div
                            key={`${entry.created_at}-${index}`}
                            className="flex gap-4"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                              ✓
                            </span>
                            <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                              <div className="flex flex-col justify-between gap-1 sm:flex-row">
                                <p className="font-semibold">
                                  {milestoneLabels[entry.milestone] ||
                                    entry.milestone}
                                </p>
                                <span className="text-xs text-slate-500">
                                  {formatDate(entry.created_at)}
                                </span>
                              </div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">
                                {entry.remarks || 'No additional remarks.'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
                  <h2 className="text-lg font-bold">Add Tracking Update</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Submit the next milestone to the backend.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-5 space-y-5">
                    <div>
                      <label
                        htmlFor="milestone"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Shipment milestone
                      </label>
                      <select
                        id="milestone"
                        required
                        disabled={!nextMilestone || saving}
                        value={form.milestone}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            milestone: event.target.value,
                          }))
                        }
                        className={inputClass}
                      >
                        {allowedMilestones.map((milestone) => (
                          <option key={milestone} value={milestone}>
                            {milestoneLabels[milestone] || milestone}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Only the next valid milestone should be submitted.
                        Skipping milestones or repeating one is rejected by
                        the backend.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="tracking-remarks"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Remarks (optional)
                      </label>
                      <textarea
                        id="tracking-remarks"
                        maxLength={1000}
                        rows={4}
                        value={form.remarks}
                        disabled={saving}
                        onChange={(event) =>
                          setForm((previous) => ({
                            ...previous,
                            remarks: event.target.value,
                          }))
                        }
                        placeholder="Add relevant shipment activity details..."
                        className={inputClass}
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Maximum 1,000 characters.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={saving || !nextMilestone}
                      className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {saving ? 'Saving update...' : '+ Save Tracking Update'}
                    </button>
                  </form>
                </section>
              </>
            ) : (
              <section className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div>
                  <p className="text-3xl">📍</p>
                  <h2 className="mt-3 text-lg font-bold">
                    {loading ? 'Loading shipments...' : 'No trackable shipments'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {loading
                      ? 'Retrieving your shipments from the server.'
                      : 'Accepted and in-progress shipments will appear here.'}
                  </p>
                </div>
              </section>
            )}
          </div>
        </div>

        <p className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <strong>Backend integration:</strong> Tracking updates are saved to
          the database. Existing tracking history is not yet available to
          providers through the current API, so this page displays only updates
          submitted during the current visit.
        </p>
      </div>
    </div>
  )
}