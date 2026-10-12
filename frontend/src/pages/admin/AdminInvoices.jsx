
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusStyles = {
  paid: 'bg-emerald-50 text-emerald-700',
  successful: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  unpaid: 'bg-amber-50 text-amber-700',
  overdue: 'bg-red-50 text-red-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
}

function formatStatus(status) {
  if (!status) return 'Unknown'

  return String(status)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const amount = Number(value)

  return Number.isFinite(amount)
    ? amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      })
    : String(value)
}

function getStatusKey(status) {
  return String(status || '').trim().toLowerCase()
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')

  async function loadInvoices() {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/admin/invoices')

      if (!data.success) {
        throw new Error(data.message || 'Failed to load invoices.')
      }

      setInvoices(data.invoices || [])
    } catch (err) {
      setError(err.message || 'Unable to load invoices.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [])

  const stats = useMemo(() => {
    const totalAmount = invoices.reduce(
      (sum, invoice) => sum + (Number(invoice.amount) || 0),
      0,
    )

    const successfulPayments = invoices.reduce(
      (sum, invoice) =>
        sum + (Number(invoice.successful_payment_amount) || 0),
      0,
    )

    const countStatus = (statuses) =>
      invoices.filter((invoice) =>
        statuses.includes(getStatusKey(invoice.status)),
      ).length

    return {
      total: invoices.length,
      totalAmount,
      successfulPayments,
      pending: countStatus(['pending', 'unpaid']),
      paid: countStatus(['paid', 'successful']),
      overdue: countStatus(['overdue']),
    }
  }, [invoices])

  const statuses = useMemo(
    () => [
      ...new Set(
        invoices.map((invoice) => invoice.status).filter(Boolean),
      ),
    ],
    [invoices],
  )

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase()

    return invoices.filter((invoice) => {
      const searchableValues = [
        invoice.id,
        invoice.invoice_number,
        invoice.shipment_id,
        invoice.business_user_name,
        invoice.business_user_email,
        invoice.origin,
        invoice.destination,
        invoice.mode,
        invoice.status,
      ]

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesStatus =
        statusFilter === 'All' || invoice.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [invoices, search, statusFilter])

  async function openInvoice(invoice) {
    setSelectedInvoice(invoice)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const data = await apiRequest(`/admin/invoices/${invoice.id}`)

      if (!data.success || !data.invoice) {
        throw new Error(data.message || 'Failed to load invoice details.')
      }

      setSelectedInvoice(data.invoice)
    } catch (err) {
      setDetailsError(
        err.message || 'Unable to load invoice details.',
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportCSV() {
    const columns = [
      ['id', 'Invoice ID'],
      ['invoice_number', 'Invoice Number'],
      ['amount', 'Invoice Amount'],
      ['status', 'Invoice Status'],
      ['created_at', 'Created Date'],
      ['shipment_id', 'Shipment ID'],
      ['origin', 'Origin'],
      ['destination', 'Destination'],
      ['mode', 'Transport Mode'],
      ['shipment_status', 'Shipment Status'],
      ['business_user_id', 'Business User ID'],
      ['business_user_name', 'Business User'],
      ['business_user_email', 'Business User Email'],
      ['successful_payment_amount', 'Successful Payments'],
    ]

    const escapeCSV = (value) => {
      let text = String(value ?? '')

      // Prevent spreadsheet formulas from executing.
      if (/^[=+\-@\t\r]/.test(text)) {
        text = `'${text}`
      }

      return `"${text.replaceAll('"', '""')}"`
    }

    const rows = [
      columns.map(([, label]) => escapeCSV(label)).join(','),
      ...filteredInvoices.map((invoice) =>
        columns.map(([key]) => escapeCSV(invoice[key])).join(','),
      ),
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smart-cargo-invoices.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const detailRows = selectedInvoice
    ? [
        ['Invoice ID', selectedInvoice.id],
        ['Invoice Number', selectedInvoice.invoice_number],
        ['Invoice Amount', formatMoney(selectedInvoice.amount)],
        ['Invoice Status', formatStatus(selectedInvoice.status)],
        ['Created Date', formatDate(selectedInvoice.created_at)],
        ['Shipment ID', selectedInvoice.shipment_id],
        ['Shipment Origin', selectedInvoice.origin],
        ['Shipment Destination', selectedInvoice.destination],
        ['Transport Mode', formatStatus(selectedInvoice.mode)],
        [
          'Shipment Status',
          formatStatus(selectedInvoice.shipment_status),
        ],
        ['Business User ID', selectedInvoice.business_user_id],
        ['Business User', selectedInvoice.business_user_name],
        ['Business User Email', selectedInvoice.business_user_email],
        [
          'Successful Payment Amount',
          formatMoney(selectedInvoice.successful_payment_amount),
        ],
      ]
    : []

  return (
    <div className="min-h-screen bg-slate-100 p-5 text-slate-900 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Administration / Finance
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
              Invoice Management
            </h1>

            <p className="mt-2 text-slate-600">
              Review invoice amounts, shipment details, customers, and
              successful payments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadInvoices}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || Boolean(error) || filteredInvoices.length === 0}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Invoices',
              value: stats.total,
              icon: '📄',
            },
            {
              label: 'Total Invoice Value',
              value: formatMoney(stats.totalAmount),
              icon: '₹',
            },
            {
              label: 'Successful Payments',
              value: formatMoney(stats.successfulPayments),
              icon: '✓',
            },
            {
              label: 'Pending / Unpaid',
              value: stats.pending,
              icon: '⏳',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <span className="text-xl">{stat.icon}</span>
              </div>

              <p className="mt-3 break-words text-2xl font-extrabold">
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-bold">Invoices</h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading invoices...'
                : `${filteredInvoices.length} matching invoice${filteredInvoices.length === 1 ? '' : 's'}`}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoice, shipment, or customer..."
                aria-label="Search invoices"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter invoices by status"
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              >
                <option value="All">All statuses</option>

                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="font-semibold">Could not load invoices</p>
              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={loadInvoices}
                className="mt-3 rounded-lg border border-red-300 px-3 py-2 font-semibold hover:bg-red-100"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Invoice</th>
                  <th className="px-5 py-4 font-semibold">Business User</th>
                  <th className="px-5 py-4 font-semibold">Shipment Route</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Paid Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {invoice.invoice_number || `Invoice #${invoice.id}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          ID: {invoice.id}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(invoice.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {invoice.business_user_name || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {invoice.business_user_email || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {invoice.origin || '—'} → {invoice.destination || '—'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Shipment #{invoice.shipment_id ?? '—'} ·{' '}
                          {formatStatus(invoice.mode)}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatMoney(invoice.amount)}
                      </td>

                      <td className="px-5 py-4 font-semibold text-emerald-700">
                        {formatMoney(invoice.successful_payment_amount)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[getStatusKey(invoice.status)] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {formatStatus(invoice.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openInvoice(invoice)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredInvoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {invoices.length === 0
                        ? 'No invoices have been registered yet.'
                        : 'No invoices match your current search and filters.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading invoices...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedInvoice && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedInvoice(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="invoice-dialog-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Invoice Details
                  </p>

                  <h2
                    id="invoice-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    {selectedInvoice.invoice_number ||
                      `Invoice #${selectedInvoice.id}`}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  aria-label="Close invoice details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading invoice details...
                </p>
              ) : detailsError ? (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {detailsError}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {detailRows.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex flex-col justify-between gap-1 border-b border-slate-100 pb-3 sm:flex-row sm:gap-4"
                    >
                      <span className="text-sm text-slate-500">{label}</span>
                      <span className="break-words text-sm font-semibold sm:text-right">
                        {value ?? '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Invoice details are read-only. The current admin API supports
                listing and viewing invoices but does not provide invoice
                update, payment, or deletion endpoints.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
