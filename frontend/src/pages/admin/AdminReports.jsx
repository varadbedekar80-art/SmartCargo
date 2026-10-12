
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api';

const formatNumber = (value) =>
  Number(value || 0).toLocaleString('en-IN');

const formatMonth = (value) => {
  if (!value) return 'Unknown';

  const date = new Date(`${value}-01T00:00:00`);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      });
};

function SummaryCard({ title, value, description, icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatNumber(value)}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-xl">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ label, value }) {
  const colors = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    delivered: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span
      className={`inline-flex min-w-20 justify-center rounded-full px-3 py-1 text-xs font-semibold ${
        colors[label] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {formatNumber(value)}
    </span>
  );
}

export default function AdminReports() {
  const [modeReport, setModeReport] = useState([]);
  const [monthlyReport, setMonthlyReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [modeResponse, monthlyResponse] = await Promise.all([
        apiRequest('/admin/reports/shipments'),
        apiRequest('/admin/reports/shipments/monthly'),
      ]);

      setModeReport(
        Array.isArray(modeResponse.report) ? modeResponse.report : []
      );

      setMonthlyReport(
        Array.isArray(monthlyResponse.report)
          ? [...monthlyResponse.report].reverse()
          : []
      );
    } catch (err) {
      setError(err.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const totals = useMemo(
    () =>
      modeReport.reduce(
        (result, row) => ({
          shipments: result.shipments + Number(row.total_shipments || 0),
          pending: result.pending + Number(row.pending_shipments || 0),
          confirmed: result.confirmed + Number(row.confirmed_shipments || 0),
          rejected: result.rejected + Number(row.rejected_shipments || 0),
          delivered: result.delivered + Number(row.delivered_shipments || 0),
        }),
        {
          shipments: 0,
          pending: 0,
          confirmed: 0,
          rejected: 0,
          delivered: 0,
        }
      ),
    [modeReport]
  );

  const maxMonthly = Math.max(
    1,
    ...monthlyReport.map((row) => Number(row.total_shipments || 0))
  );

  const exportCsv = () => {
    const rows = [
      ['Shipment Report by Transport Mode'],
      [
        'Transport Mode',
        'Total Shipments',
        'Pending',
        'Confirmed',
        'Rejected',
        'Delivered',
      ],
      ...modeReport.map((row) => [
        row.mode || 'Unknown',
        row.total_shipments || 0,
        row.pending_shipments || 0,
        row.confirmed_shipments || 0,
        row.rejected_shipments || 0,
        row.delivered_shipments || 0,
      ]),
      [],
      ['Monthly Shipment Report'],
      ['Month', 'Total Shipments'],
      ...monthlyReport.map((row) => [
        row.month || 'Unknown',
        row.total_shipments || 0,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? '');
            return `"${value.replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'smart-cargo-shipment-reports.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">
            Loading shipment reports...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-800">
          Could not load reports
        </h2>
        <p className="mt-2 text-sm text-red-700">{error}</p>
        <button
          onClick={loadReports}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Shipment Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Shipment performance by transport mode and month.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadReports}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ↻ Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!modeReport.length && !monthlyReport.length}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Shipments"
          value={totals.shipments}
          description="Across all transport modes"
          icon="📦"
        />
        <SummaryCard
          title="Pending"
          value={totals.pending}
          description="Awaiting further action"
          icon="⏳"
        />
        <SummaryCard
          title="Confirmed"
          value={totals.confirmed}
          description="Confirmed shipments"
          icon="✓"
        />
        <SummaryCard
          title="Delivered"
          value={totals.delivered}
          description="Successfully delivered"
          icon="🚚"
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Shipment Breakdown by Transport Mode
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Counts are taken directly from the shipment database.
          </p>
        </div>

        {modeReport.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-3xl">📊</p>
            <p className="mt-3 font-semibold text-slate-700">
              No shipment data available
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Reports will appear here when shipments are recorded.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    'Transport Mode',
                    'Total',
                    'Pending',
                    'Confirmed',
                    'Rejected',
                    'Delivered',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modeReport.map((row, index) => (
                  <tr
                    key={row.mode || index}
                    className="hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold capitalize text-slate-800">
                      {row.mode || 'Unknown'}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900">
                      {formatNumber(row.total_shipments)}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label="pending"
                        value={row.pending_shipments}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label="confirmed"
                        value={row.confirmed_shipments}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label="rejected"
                        value={row.rejected_shipments}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge
                        label="delivered"
                        value={row.delivered_shipments}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Monthly Shipment Trend
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Shipments created each month over the last 12 months returned by
            the backend.
          </p>
        </div>

        {monthlyReport.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-3xl">📈</p>
            <p className="mt-3 font-semibold text-slate-700">
              No monthly data available
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {monthlyReport.map((row) => {
              const count = Number(row.total_shipments || 0);
              const width = (count / maxMonthly) * 100;

              return (
                <div key={row.month}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-sm font-medium text-slate-700">
                      {formatMonth(row.month)}
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatNumber(count)}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-slate-500">
        Reports are read-only. The figures reflect the records returned by the
        backend and are not manually editable.
      </p>
    </div>
  );
}
