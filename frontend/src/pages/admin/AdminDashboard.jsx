
import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';

const currency = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '—';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatStatus = (status) => {
  if (!status) return 'Unknown';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const statusStyles = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-700',
  completed: 'bg-green-100 text-green-700',
};

function StatCard({ title, value, description, icon, color }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>

          <h3 className="mt-3 text-3xl font-bold text-gray-900">
            {value ?? 0}
          </h3>

          <p className="mt-2 text-xs text-gray-500">{description}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const [dashboardResponse, shipmentResponse] = await Promise.all([
          apiRequest('/admin/dashboard'),
          apiRequest('/admin/shipments'),
        ]);

        if (!active) return;

        setSummary(dashboardResponse.summary || {});

        const records = shipmentResponse.shipments ?? [];

        setShipments(Array.isArray(records) ? records.slice(0, 5) : []);
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              'Unable to load administrator dashboard data.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const users = summary?.users || {};
  const shipmentSummary = summary?.shipments || {};
  const offers = summary?.offers || {};
  const invoices = summary?.invoices || {};
  const payments = summary?.payments || {};

  const statCards = [
    {
      title: 'Total Shipments',
      value: shipmentSummary.total_shipments,
      description: 'All recorded shipments',
      icon: '📦',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Business Users',
      value: users.business_users,
      description: 'Registered businesses',
      icon: '🏢',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Logistics Providers',
      value: users.providers,
      description: 'Registered providers',
      icon: '🚚',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Pending Shipments',
      value: shipmentSummary.pending_shipments,
      description: 'Awaiting processing',
      icon: '⏳',
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  const quickActions = [
    {
      title: 'User Management',
      description: 'View and manage registered users',
      icon: '👥',
      page: 'User Management',
    },
    {
      title: 'Provider Management',
      description: 'Review logistics providers',
      icon: '🚛',
      page: 'Provider Management',
    },
    {
      title: 'Shipments',
      description: 'View all shipment records',
      icon: '📦',
      page: 'Shipments',
    },
    {
      title: 'Reports',
      description: 'Review logistics reports',
      icon: '📊',
      page: 'Reports',
    },
  ];

  return (
    <div className="space-y-8 p-6 lg:p-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Administrator Dashboard
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Smart Cargo Export &amp; Logistics Management System
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm">
          Loading dashboard data...
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          role="alert"
        >
          <p className="font-semibold">Could not load dashboard data.</p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-xs">
            Check that you are logged in with an administrator account and
            that the backend server is running.
          </p>
        </div>
      )}

      {/* Statistics */}
      {!loading && !error && (
        <>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Overview
              </h2>

              <span className="text-xs text-gray-500">
                Live database statistics
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <StatCard key={card.title} {...card} />
              ))}
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => onNavigate?.(action.page)}
                  className="rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    {action.icon}
                  </div>

                  <h3 className="mt-4 font-semibold text-gray-900">
                    {action.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    {action.description}
                  </p>

                  <span className="mt-4 inline-block text-sm font-medium text-blue-600">
                    Open section →
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Recent shipments */}
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent Shipments
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  The five most recent shipment records
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate?.('Shipments')}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                View all shipments
              </button>
            </div>

            {shipments.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl">📦</div>

                <h3 className="mt-3 font-semibold text-gray-800">
                  No shipments yet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Shipment records will appear here when they are created.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Shipment ID</th>
                      <th className="px-5 py-4 font-semibold">Business User</th>
                      <th className="px-5 py-4 font-semibold">Provider</th>
                      <th className="px-5 py-4 font-semibold">Route</th>
                      <th className="px-5 py-4 font-semibold">Mode</th>
                      <th className="px-5 py-4 font-semibold">Amount</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {shipments.map((shipment) => {
                      const amount =
                        shipment.confirmed_price ??
                        shipment.estimated_price ??
                        shipment.quoted_rate;

                      const status = String(
                        shipment.status || 'unknown'
                      ).toLowerCase();

                      const route =
                        shipment.route ||
                        [
                          shipment.origin,
                          shipment.destination,
                        ]
                          .filter(Boolean)
                          .join(' → ') ||
                        '—';

                      return (
                        <tr
                          key={shipment.id}
                          className="transition hover:bg-gray-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-900">
                            #{shipment.id}
                          </td>

                          <td className="px-5 py-4 text-gray-700">
                            <div className="font-medium">
                              {shipment.business_user_name || '—'}
                            </div>

                            {shipment.business_user_email && (
                              <div className="mt-1 text-xs text-gray-500">
                                {shipment.business_user_email}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-gray-700">
                            {shipment.provider_company || '—'}
                          </td>

                          <td className="px-5 py-4 text-gray-700">
                            {route}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                            {shipment.mode
                              ? String(shipment.mode).toUpperCase()
                              : '—'}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                            {currency(amount)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                statusStyles[status] ||
                                'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {formatStatus(status)}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                            {shipment.created_at
                              ? new Date(
                                  shipment.created_at
                                ).toLocaleDateString('en-IN')
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Additional summaries */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              System Summary
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Total Offers</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {offers.total_offers ?? 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Active: {offers.active_offers ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {invoices.total_invoices ?? 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Unpaid: {invoices.unpaid_invoices ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Payment Records</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {payments.total_payment_records ?? 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Successful: {payments.successful_payments ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Administrators</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {users.administrators ?? 0}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Authorized admin accounts
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
