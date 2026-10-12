

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';

const initialFormData = {
  cargoName: '',
  cargoType: 'General Cargo',
  quantity: '1',
  weight: '',
  transportMode: 'sea',
  origin: '',
  destination: '',
  pickupDate: '',
  deliveryDate: '',
  description: '',
};

function formatMode(mode) {
  const modes = {
    air: 'Air Freight',
    sea: 'Sea Freight',
    road: 'Road Transport',
  };

  return modes[String(mode || '').toLowerCase()] || mode || 'Not specified';
}

function formatOfferType(type) {
  return type === 'route_specific'
    ? 'Route Specific'
    : 'General Capacity';
}

function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return 'Price unavailable';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function routeMatches(offer, origin, destination) {
  if (offer.offer_type === 'general_capacity') {
    return ['global', 'nationwide'].includes(
      String(offer.coverage || '').toLowerCase()
    );
  }

  const offerOrigin = String(offer.origin || '').trim().toLowerCase();
  const offerDestination = String(offer.destination || '')
    .trim()
    .toLowerCase();

  return (
    offerOrigin === origin.trim().toLowerCase() &&
    offerDestination === destination.trim().toLowerCase()
  );
}

export default function CreateShipment() {
  const [formData, setFormData] = useState(initialFormData);
  const [offers, setOffers] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState('');
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Retain the cargo ID if cargo creation succeeds but shipment creation fails.
  const [createdCargoId, setCreatedCargoId] = useState(null);

  const loadOffers = useCallback(async () => {
    setLoadingOffers(true);
    setErrorMessage('');

    try {
      const response = await apiRequest('/offers/active');
      setOffers(Array.isArray(response.offers) ? response.offers : []);
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to load available shipping offers.'
      );
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrorMessage('');
    setSuccessMessage('');
  };

  const compatibleOffers = useMemo(() => {
    const weight = Number(formData.weight);
    const mode = formData.transportMode.toLowerCase();

    if (!Number.isFinite(weight) || weight <= 0) {
      return [];
    }

    return offers.filter((offer) => {
      const offerMode = String(offer.mode || '').toLowerCase();
      const availableSpace = Number(offer.available_space);
      const maxWeight = Number(offer.max_weight_kg);

      return (
        offerMode === mode &&
        weight <= availableSpace &&
        weight <= maxWeight &&
        routeMatches(offer, formData.origin, formData.destination)
      );
    });
  }, [
    offers,
    formData.weight,
    formData.transportMode,
    formData.origin,
    formData.destination,
  ]);

  useEffect(() => {
    if (
      selectedOfferId &&
      !compatibleOffers.some(
        (offer) => String(offer.id) === String(selectedOfferId)
      )
    ) {
      setSelectedOfferId('');
    }
  }, [compatibleOffers, selectedOfferId]);

  const selectedOffer = compatibleOffers.find(
    (offer) => String(offer.id) === String(selectedOfferId)
  );

  const estimatedPrice = selectedOffer
    ? Number(selectedOffer.rate_per_kg) * Number(formData.weight)
    : null;

  const validateForm = () => {
    if (!formData.cargoName.trim()) {
      return 'Please enter the cargo name.';
    }

    if (!formData.origin.trim() || !formData.destination.trim()) {
      return 'Please enter both origin and destination.';
    }

    if (
      formData.origin.trim().toLowerCase() ===
      formData.destination.trim().toLowerCase()
    ) {
      return 'Origin and destination cannot be the same.';
    }

    if (!Number.isFinite(Number(formData.quantity)) ||
        Number(formData.quantity) < 1 ||
        !Number.isInteger(Number(formData.quantity))) {
      return 'Quantity must be a positive whole number.';
    }

    if (!Number.isFinite(Number(formData.weight)) ||
        Number(formData.weight) <= 0) {
      return 'Please enter a valid weight greater than zero.';
    }

    if (!selectedOfferId || !selectedOffer) {
      return 'Please select a compatible shipping offer.';
    }

    if (
      formData.pickupDate &&
      formData.deliveryDate &&
      formData.deliveryDate < formData.pickupDate
    ) {
      return 'Delivery date cannot be earlier than pickup date.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    try {
      let cargoId = createdCargoId;

      // Create cargo only once. If shipment creation failed previously,
      // reuse the cargo ID instead of creating duplicate cargo records.
      if (!cargoId) {
        const cargoResponse = await apiRequest('/cargo', {
          method: 'POST',
          body: JSON.stringify({
            name: formData.cargoName.trim(),
            description: formData.description.trim(),
            weightKg: Number(formData.weight),
            quantity: Number(formData.quantity),
          }),
        });

        if (!cargoResponse.cargo?.id) {
          throw new Error(
            'Cargo was submitted, but its ID was not returned by the server.'
          );
        }

        cargoId = cargoResponse.cargo.id;
        setCreatedCargoId(cargoId);
      }

      const shipmentResponse = await apiRequest('/shipments', {
        method: 'POST',
        body: JSON.stringify({
          cargoId,
          origin: formData.origin.trim(),
          destination: formData.destination.trim(),
          offerId: Number(selectedOfferId),
        }),
      });

      setSuccessMessage(
        shipmentResponse.message ||
          'Shipment request created successfully.'
      );

      setFormData(initialFormData);
      setSelectedOfferId('');
      setCreatedCargoId(null);

      await loadOffers();
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to create the shipment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    // Do not discard a cargo ID that must be reused after a failed shipment
    // request. Complete the shipment retry before resetting the form.
    if (createdCargoId) {
      setErrorMessage(
        'Cargo has already been saved. Please retry creating the shipment before resetting the form.'
      );
      return;
    }

    setFormData(initialFormData);
    setSelectedOfferId('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Create Shipment
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enter your cargo details and choose a compatible shipping offer.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      {createdCargoId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your cargo has been saved, but the shipment request has not
          completed. Retry submission to reuse the saved cargo instead of
          creating a duplicate.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Cargo Details
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="cargoName"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Cargo Name *
              </label>
              <input
                id="cargoName"
                name="cargoName"
                value={formData.cargoName}
                onChange={handleChange}
                placeholder="e.g. Electronic Components"
                required
                disabled={submitting || Boolean(createdCargoId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="cargoType"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Cargo Type
              </label>
              <select
                id="cargoType"
                name="cargoType"
                value={formData.cargoType}
                onChange={handleChange}
                disabled={submitting || Boolean(createdCargoId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                <option>General Cargo</option>
                <option>Electronics</option>
                <option>Machinery</option>
                <option>Textiles</option>
                <option>Food Products</option>
                <option>Fragile Goods</option>
                <option>Perishable Goods</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Quantity *
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                step="1"
                value={formData.quantity}
                onChange={handleChange}
                required
                disabled={submitting || Boolean(createdCargoId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="weight"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Total Weight (kg) *
              </label>
              <input
                id="weight"
                name="weight"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Enter weight in kg"
                required
                disabled={submitting || Boolean(createdCargoId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the cargo, packaging, or special handling requirements"
                disabled={submitting || Boolean(createdCargoId)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Shipping Details
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="transportMode"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Transport Mode *
              </label>
              <select
                id="transportMode"
                name="transportMode"
                value={formData.transportMode}
                onChange={handleChange}
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              >
                <option value="air">Air Freight</option>
                <option value="sea">Sea Freight</option>
                <option value="road">Road Transport</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="origin"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Origin *
              </label>
              <input
                id="origin"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                placeholder="e.g. Mumbai"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="destination"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Destination *
              </label>
              <input
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="e.g. Dubai"
                required
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="pickupDate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Preferred Pickup Date
              </label>
              <input
                id="pickupDate"
                name="pickupDate"
                type="date"
                value={formData.pickupDate}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="deliveryDate"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Preferred Delivery Date
              </label>
              <input
                id="deliveryDate"
                name="deliveryDate"
                type="date"
                min={formData.pickupDate || undefined}
                value={formData.deliveryDate}
                onChange={handleChange}
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Available Shipping Offers
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Offers are filtered by transport mode, route, and cargo weight.
              </p>
            </div>

            <button
              type="button"
              onClick={loadOffers}
              disabled={loadingOffers || submitting}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingOffers ? 'Refreshing...' : 'Refresh Offers'}
            </button>
          </div>

          {loadingOffers ? (
            <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-600">
              Loading shipping offers...
            </p>
          ) : compatibleOffers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
              <p className="font-medium text-gray-800">
                No compatible offers found
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Try another transport mode, adjust the weight, or check the
                origin and destination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {compatibleOffers.map((offer) => {
                const isSelected =
                  String(selectedOfferId) === String(offer.id);

                const price =
                  Number(offer.rate_per_kg) * Number(formData.weight);

                return (
                  <button
                    type="button"
                    key={offer.id}
                    onClick={() => {
                      setSelectedOfferId(String(offer.id));
                      setErrorMessage('');
                    }}
                    disabled={submitting}
                    aria-pressed={isSelected}
                    className={`rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    } disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {offer.company_name || 'Logistics Provider'}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {formatMode(offer.mode)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Offer Type</span>
                        <span className="text-right font-medium text-gray-900">
                          {formatOfferType(offer.offer_type)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Route</span>
                        <span className="text-right font-medium text-gray-900">
                          {offer.offer_type === 'route_specific'
                            ? `${offer.origin} → ${offer.destination}`
                            : offer.coverage === 'global'
                              ? 'Global Coverage'
                              : 'Nationwide Coverage'}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Rate per kg</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(offer.rate_per_kg)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Available Space</span>
                        <span className="font-medium text-gray-900">
                          {offer.available_space} kg
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-gray-600">Maximum Weight</span>
                        <span className="font-medium text-gray-900">
                          {offer.max_weight_kg} kg
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-white p-3">
                      <p className="text-xs text-gray-500">
                        Estimated shipping price
                      </p>
                      <p className="mt-1 text-lg font-bold text-blue-700">
                        {formatCurrency(price)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedOffer && (
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="font-semibold text-blue-900">
                Selected: {selectedOffer.company_name || 'Logistics Provider'}
              </p>
              <p className="mt-1 text-sm text-blue-800">
                Estimated cost: {formatCurrency(estimatedPrice)}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                Final charges may differ from this estimate.
              </p>
            </div>
          )}
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={resetForm}
            disabled={submitting || Boolean(createdCargoId)}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={submitting || loadingOffers}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? 'Creating Shipment...'
              : createdCargoId
                ? 'Retry Shipment Creation'
                : 'Create Shipment'}
          </button>
        </div>
      </form>
    </div>
  );
}
