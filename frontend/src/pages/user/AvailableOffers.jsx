

import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const formatPrice = (price) =>
  price == null || Number.isNaN(Number(price))
    ? 'Not available'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(Number(price))

const getProvider = (offer) =>
  offer.company_name || offer.provider_name || offer.companyName || 'Logistics Provider'

const getMode = (offer) =>
  offer.mode || offer.transport_mode || offer.transportMode || 'Other'

const getRate = (offer) =>
  offer.rate_per_kg ?? offer.ratePerKg

const getMaxWeight = (offer) =>
  offer.max_weight_kg ?? offer.maxWeightKg

const getRoute = (offer) => {
  if (offer.origin && offer.destination) {
    return `${offer.origin} → ${offer.destination}`
  }

  return offer.coverage || 'Route details available from provider'
}

export default function AvailableOffers({ onNavigate }) {
  const [offers, setOffers] = useState([])
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('All')
  const [sortBy, setSortBy] = useState('priceLow')
  const [selectedOffer, setSelectedOffer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadOffers() {
      setLoading(true)
      setError('')

      try {
        const result = await apiRequest('/offers/active')

        if (active) {
          setOffers(result.offers || [])
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load available offers.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadOffers()

    return () => {
      active = false
    }
  }, [])

  const modes = useMemo(
    () => [...new Set(offers.map(getMode))],
    [offers],
  )

  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return offers
      .filter((offer) => {
        const searchText = [
          getProvider(offer),
          getMode(offer),
          offer.origin,
          offer.destination,
          offer.coverage,
          offer.offer_type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const matchesSearch = searchText.includes(query)
        const matchesMode =
          modeFilter === 'All' || getMode(offer) === modeFilter

        return matchesSearch && matchesMode
      })
      .sort((a, b) => {
        const priceA = Number(getRate(a) ?? Infinity)
        const priceB = Number(getRate(b) ?? Infinity)

        if (sortBy === 'priceLow') return priceA - priceB
        if (sortBy === 'priceHigh') return priceB - priceA

        return getProvider(a).localeCompare(getProvider(b))
      })
  }, [offers, search, modeFilter, sortBy])

  const createShipment = () => {
    setSelectedOffer(null)

    if (onNavigate) {
      onNavigate('Create Shipment')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-sm font-medium text-blue-700">
            Business User / Logistics
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
            Available Offers
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-600">
            Compare active logistics offers and choose a provider for your
            shipment.
          </p>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Active offers loaded</p>
            <p className="mt-2 text-3xl font-extrabold">
              {loading ? '—' : offers.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Transport options</p>
            <p className="mt-2 text-3xl font-extrabold">
              {loading ? '—' : modes.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Matching offers</p>
            <p className="mt-2 text-3xl font-extrabold">
              {loading ? '—' : filteredOffers.length}
            </p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="offerSearch"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search offers
              </label>
              <input
                id="offerSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Provider, route, or mode..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="modeFilter"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Transport mode
              </label>
              <select
                id="modeFilter"
                value={modeFilter}
                onChange={(event) => setModeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              >
                <option value="All">All modes</option>
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sortOffers"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Sort offers
              </label>
              <select
                id="sortOffers"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600"
              >
                <option value="priceLow">Rate: low to high</option>
                <option value="priceHigh">Rate: high to low</option>
                <option value="provider">Provider name</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p className="font-semibold">Could not load offers</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 font-semibold underline"
            >
              Reload page
            </button>
          </div>
        )}

        {loading && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">
            Loading active offers...
          </div>
        )}

        {!loading && !error && (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {filteredOffers.map((offer) => (
              <article
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
                  <div>
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {getMode(offer)}
                    </span>
                    <h2 className="mt-3 text-lg font-bold">
                      {getProvider(offer)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Offer ID: {offer.id}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-extrabold text-blue-700">
                      {formatPrice(getRate(offer))}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Per kg
                    </p>
                  </div>
                </div>

                <div className="p-5">
                  <div>
                    <p className="text-xs text-slate-500">Route / coverage</p>
                    <p className="mt-2 font-semibold">{getRoute(offer)}</p>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Maximum weight</p>
                      <p className="mt-1 font-semibold">
                        {getMaxWeight(offer) != null
                          ? `${getMaxWeight(offer)} kg`
                          : 'Not specified'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">Offer type</p>
                      <p className="mt-1 font-semibold">
                        {offer.offer_type || 'Standard'}
                      </p>
                    </div>
                  </div>

                  {offer.available_space != null && (
                    <p className="mt-4 text-sm text-slate-600">
                      Available space: {offer.available_space}
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer(offer)}
                      className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold hover:bg-slate-50"
                    >
                      View details
                    </button>

                    <button
                      type="button"
                      onClick={createShipment}
                      className="flex-1 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Create Shipment →
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {filteredOffers.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center lg:col-span-2">
                <p className="text-lg font-bold">No matching offers found</p>
                <p className="mt-2 text-sm text-slate-500">
                  Try another search or transport mode.
                </p>
              </div>
            )}
          </div>
        )}

        {selectedOffer && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onClick={() => setSelectedOffer(null)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="offerDialogTitle"
              className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Active logistics offer
                  </p>
                  <h2 id="offerDialogTitle" className="mt-1 text-2xl font-bold">
                    {getProvider(selectedOffer)}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOffer(null)}
                  aria-label="Close offer details"
                  className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-6 space-y-4 text-sm">
                {[
                  ['Offer ID', selectedOffer.id],
                  ['Transport mode', getMode(selectedOffer)],
                  ['Route / coverage', getRoute(selectedOffer)],
                  ['Rate per kg', formatPrice(getRate(selectedOffer))],
                  [
                    'Maximum weight',
                    getMaxWeight(selectedOffer) != null
                      ? `${getMaxWeight(selectedOffer)} kg`
                      : 'Not specified',
                  ],
                  ['Offer type', selectedOffer.offer_type || 'Standard'],
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

              <p className="mt-4 text-xs leading-5 text-slate-500">
                The final estimated shipment cost depends on the selected
                cargo weight and the offer rate.
              </p>

              <button
                type="button"
                onClick={createShipment}
                className="mt-5 w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Continue to Create Shipment →
              </button>
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
