
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

export default function UserDashboard({ onNavigate, user }) {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Load shipment data from the backend.
  useEffect(() => {
    let cancelled = false;

    async function loadShipments() {
      if (reloadKey === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError('');

      try {
        const result = await apiRequest('/shipments');

        if (result.success === false) {
          throw new Error(
            result.message || 'Unable to load shipments.'
          );
        }

        // Support the common response formats used by APIs.
        const shipmentList = Array.isArray(result.shipments)
          ? result.shipments
          : Array.isArray(result.data?.shipments)
            ? result.data.shipments
            : Array.isArray(result.data)
              ? result.data
              : null;

        if (!shipmentList) {
          throw new Error(
            result.message ||
              'The server response did not contain a shipment list.'
          );
        }

        if (!cancelled) {
          setShipments(shipmentList);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || 'Unable to load dashboard data.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadShipments();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refreshDashboard = () => {
    setReloadKey((previous) => previous + 1);
  };

  const getStatus = (shipment) =>
    String(shipment.status || 'Pending')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const getShipmentId = (shipment) =>
    shipment.tracking_number ||
    shipment.trackingNumber ||
    shipment.shipment_number ||
    shipment.shipmentNumber ||
    shipment.id ||
    '—';

  const getShipmentDate = (shipment) => {
    const date = shipment.created_at || shipment.createdAt;

    if (!date) return '—';

    const parsedDate = new Date(date);

    return Number.isNaN(parsedDate.getTime())
      ? '—'
      : parsedDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  };

  const getRoute = (shipment) => {
    const origin =
      shipment.origin ||
      shipment.origin_port ||
      shipment.originPort ||
      shipment.source ||
      '—';

    const destination =
      shipment.destination ||
      shipment.destination_port ||
      shipment.destinationPort ||
      shipment.destination_location ||
      shipment.destinationLocation ||
      '—';

    return `${origin} → ${destination}`;
  };

  const getTransport = (shipment) => {
    const mode =
      shipment.mode ||
      shipment.transport_mode ||
      shipment.transportMode;

    if (!mode) return '—';

    return String(mode)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const statusStyle = {
    'In Transit': 'bg-cyan-50 text-cyan-700',
    Pending: 'bg-amber-50 text-amber-700',
    Requested: 'bg-amber-50 text-amber-700',
    Confirmed: 'bg-blue-50 text-blue-700',
    Accepted: 'bg-blue-50 text-blue-700',
    Delivered: 'bg-emerald-50 text-emerald-700',
    Completed: 'bg-emerald-50 text-emerald-700',
    Cancelled: 'bg-red-50 text-red-700',
    Rejected: 'bg-red-50 text-red-700',
  };

  const totalShipments = shipments.length;

  const inTransit = shipments.filter((shipment) => {
    const status = getStatus(shipment).toLowerCase();
    return status === 'in transit';
  }).length;

  const pendingRequests = shipments.filter((shipment) => {
    const status = getStatus(shipment).toLowerCase();
    return status === 'pending' || status === 'requested';
  }).length;

  const completed = shipments.filter((shipment) => {
    const status = getStatus(shipment).toLowerCase();
    return status === 'delivered' || status === 'completed';
  }).length;

  const stats = [
    {
      label: 'Total Shipments',
      value: loading ? '—' : totalShipments,
      note: 'All registered shipments',
      color: 'bg-blue-50 text-blue-700',
      icon: '▣',
    },
    {
      label: 'In Transit',
      value: loading ? '—' : inTransit,
      note: 'Currently moving',
      color: 'bg-cyan-50 text-cyan-700',
      icon: '➜',
    },
    {
      label: 'Pending Requests',
      value: loading ? '—' : pendingRequests,
      note: 'Awaiting provider response',
      color: 'bg-amber-50 text-amber-700',
      icon: '◷',
    },
    {
      label: 'Completed',
      value: loading ? '—' : completed,
      note: 'Successfully delivered',
      color: 'bg-emerald-50 text-emerald-700',
      icon: '✓',
    },
  ];

  const quickActions = [
    ['Create Shipment', 'Start a new cargo request'],
    ['Available Offers', 'Explore transport offers'],
    ['Track Shipment', 'Review shipment progress'],
    ['Invoices & Payments', 'Review billing records'],
  ];

  const recentShipments = [...shipments]
    .sort((a, b) => {
      const dateA = new Date(
        a.created_at || a.createdAt || 0
      ).getTime();

      const dateB = new Date(
        b.created_at || b.createdAt || 0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 5);

  return (
    <div className="space-y-7 text-slate-900">
      {/* Welcome section */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-800 to-slate-950 p-6 text-white sm:p-8">
        <p className="text-sm font-semibold text-cyan-300">
          BUSINESS OVERVIEW
        </p>

        <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
          Welcome{user?.name ? `, ${user.name}` : ''} to your cargo workspace
        </h2>

        <p className="mt-3 max-w-2xl leading-7 text-blue-100">
          Manage shipment requests, compare logistics offers, and monitor
          your cargo journey from one place.
        </p>

        <button
          type="button"
          onClick={() => onNavigate?.('Create Shipment')}
          className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-blue-900 hover:bg-blue-50"
        >
          + Create Shipment
        </button>
      </section>

      {/* API error */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <p className="font-semibold">
            Unable to update shipment data
          </p>

          <p className="mt-1">{error}</p>

          <button
            type="button"
            onClick={refreshDashboard}
            disabled={refreshing}
            className="mt-3 rounded-lg border border-red-300 px-4 py-2 font-semibold hover:bg-red-100 disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Dashboard statistics */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold ${stat.color}`}
            >
              {stat.icon}
            </div>

            <p className="mt-5 text-sm text-slate-500">
              {stat.label}
            </p>

            <p className="mt-1 text-3xl font-extrabold">
              {stat.value}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {stat.note}
            </p>
          </article>
        ))}
      </section>

      {/* Recent shipments */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold">
              Recent Shipments
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              An overview of your latest cargo activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={refreshing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>

            <button
              type="button"
              onClick={() => onNavigate?.('My Shipments')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              View All
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">Shipment ID</th>
                <th className="px-5 py-4">Route</th>
                <th className="px-5 py-4">Transport</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    Loading recent shipments...
                  </td>
                </tr>
              ) : recentShipments.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-slate-500"
                  >
                    No shipments found. Create your first shipment to get
                    started.
                  </td>
                </tr>
              ) : (
                recentShipments.map((shipment, index) => {
                  const status = getStatus(shipment);

                  return (
                    <tr
                      key={
                        shipment.id ??
                        shipment.tracking_number ??
                        shipment.trackingNumber ??
                        index
                      }
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold text-blue-700">
                        {getShipmentId(shipment)}
                      </td>

                      <td className="px-5 py-4">
                        {getRoute(shipment)}
                      </td>

                      <td className="px-5 py-4">
                        {getTransport(shipment)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyle[status] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {getShipmentDate(shipment)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold">
            Quick Actions
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Shortcuts to common shipping tasks.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {quickActions.map(([title, description]) => (
              <button
                type="button"
                key={title}
                onClick={() => onNavigate?.(title)}
                className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-semibold">{title}</p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {description}
                </p>
              </button>
            ))}
          </div>
        </article>

        {/* Account overview */}
        <article className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold">
            Account Overview
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Keep your exporter account details up to date.
          </p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500">
                Account type
              </span>

              <span className="text-sm font-semibold">
                Business User
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-sm text-slate-500">
                Profile status
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Connected
              </span>
            </div>

            <button
              type="button"
              onClick={() => onNavigate?.('Profile')}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Manage Profile
            </button>
          </div>
        </article>
      </section>

      <footer className="py-2 text-center text-xs text-slate-500">
        Smart Cargo Export &amp; Logistics Management System
      </footer>
    </div>
  );
}
