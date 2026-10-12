
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../services/api'

const statusStyles = {
  successful: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-emerald-50 text-emerald-700',
  paid: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  processing: 'bg-blue-50 text-blue-700',
  failed: 'bg-red-50 text-red-700',
  cancelled: 'bg-slate-100 text-slate-700',
  refunded: 'bg-purple-50 text-purple-700',
}

function getStatusKey(status) {
  return String(status || '').trim().toLowerCase()
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

function formatDateTime(value) {
  if (!value) return '—'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [error, setError] = useState('')
  const [detailsError, setDetailsError] = useState('')

  async function loadPayments() {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/admin/payments')

      if (!data.success) {
        throw new Error(data.message || 'Failed to load payments.')
      }

      setPayments(data.payments || [])
    } catch (err) {
      setError(err.message || 'Unable to load payment records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  const stats = useMemo(() => {
    const totalAmount = payments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0,
    )

    const successfulPayments = payments.filter((payment) =>
      ['successful', 'completed', 'paid'].includes(
        getStatusKey(payment.status),
      ),
    )

    const successfulAmount = successfulPayments.reduce(
      (sum, payment) => sum + (Number(payment.amount) || 0),
      0,
    )

    const pending = payments.filter((payment) =>
      ['pending', 'processing'].includes(getStatusKey(payment.status)),
    ).length

    const failed = payments.filter((payment) =>
      ['failed', 'cancelled'].includes(getStatusKey(payment.status)),
    ).length

    return {
      total: payments.length,
      totalAmount,
      successfulCount: successfulPayments.length,
      successfulAmount,
      pending,
      failed,
    }
  }, [payments])

  const statuses = useMemo(
    () => [
      ...new Set(
        payments.map((payment) => payment.status).filter(Boolean),
      ),
    ],
    [payments],
  )

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return payments.filter((payment) => {
      const searchableValues = [
        payment.id,
        payment.invoice_id,
        payment.invoice_number,
        payment.payment_reference,
        payment.business_user_name,
        payment.business_user_email,
        payment.shipment_id,
        payment.origin,
        payment.destination,
        payment.status,
      ]

      const matchesSearch =
        !query ||
        searchableValues.some((value) =>
          String(value ?? '').toLowerCase().includes(query),
        )

      const matchesStatus =
        statusFilter === 'All' || payment.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [payments, search, statusFilter])

  async function openPayment(payment) {
    setSelectedPayment(payment)
    setDetailsError('')
    setDetailsLoading(true)

    try {
      const data = await apiRequest(`/admin/payments/${payment.id}`)

      if (!data.success || !data.payment) {
        throw new Error(data.message || 'Failed to load payment details.')
      }

      setSelectedPayment(data.payment)
    } catch (err) {
      setDetailsError(
        err.message || 'Unable to load payment details.',
      )
    } finally {
      setDetailsLoading(false)
    }
  }

  function exportCSV() {
    const columns = [
      ['id', 'Payment ID'],
      ['invoice_id', 'Invoice ID'],
      ['invoice_number', 'Invoice Number'],
      ['amount', 'Payment Amount'],
      ['payment_reference', 'Payment Reference'],
      ['status', 'Payment Status'],
      ['paid_at', 'Paid At'],
      ['created_at', 'Created At'],
      ['shipment_id', 'Shipment ID'],
      ['origin', 'Origin'],
      ['destination', 'Destination'],
      ['business_user_name', 'Business User'],
      ['business_user_email', 'Business User Email'],
      ['invoice_status', 'Invoice Status'],
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
      ...filteredPayments.map((payment) =>
        columns.map(([key]) => escapeCSV(payment[key])).join(','),
      ),
    ]

    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'smart-cargo-payments.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const detailRows = selectedPayment
    ? [
        ['Payment ID', selectedPayment.id],
        ['Invoice ID', selectedPayment.invoice_id],
        ['Invoice Number', selectedPayment.invoice_number],
        ['Payment Amount', formatMoney(selectedPayment.amount)],
        ['Payment Reference', selectedPayment.payment_reference],
        ['Payment Status', formatStatus(selectedPayment.status)],
        ['Paid At', formatDateTime(selectedPayment.paid_at)],
        ['Created At', formatDateTime(selectedPayment.created_at)],
        ['Invoice Status', formatStatus(selectedPayment.invoice_status)],
        ['Shipment ID', selectedPayment.shipment_id],
        ['Origin', selectedPayment.origin],
        ['Destination', selectedPayment.destination],
        ['Business User', selectedPayment.business_user_name],
        ['Business User Email', selectedPayment.business_user_email],
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
              Payment Management
            </h1>

            <p className="mt-2 text-slate-600">
              Review payment records, references, invoice links, and customer details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadPayments}
              disabled={loading}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={loading || Boolean(error) || filteredPayments.length === 0}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Payments',
              value: stats.total,
              icon: '💳',
            },
            {
              label: 'Total Recorded Amount',
              value: formatMoney(stats.totalAmount),
              icon: '₹',
            },
            {
              label: 'Successful Payments',
              value: stats.successfulCount,
              icon: '✓',
            },
            {
              label: 'Pending / Processing',
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
            <h2 className="text-lg font-bold">Payment Records</h2>

            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading payments...'
                : `${filteredPayments.length} matching payment${filteredPayments.length === 1 ? '' : 's'}`}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search payment, invoice, or customer..."
                aria-label="Search payments"
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter payments by status"
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
              <p className="font-semibold">Could not load payments</p>
              <p className="mt-1">{error}</p>

              <button
                type="button"
                onClick={loadPayments}
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
                  <th className="px-5 py-4 font-semibold">Payment</th>
                  <th className="px-5 py-4 font-semibold">Business User</th>
                  <th className="px-5 py-4 font-semibold">Invoice / Shipment</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Paid Date</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {!loading &&
                  !error &&
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          Payment #{payment.id}
                        </p>

                        <p className="mt-1 max-w-[190px] break-words text-xs text-slate-500">
                          Ref: {payment.payment_reference || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {payment.business_user_name || '—'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {payment.business_user_email || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {payment.invoice_number || `Invoice #${payment.invoice_id}`}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Shipment #{payment.shipment_id ?? '—'}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {payment.origin || '—'} → {payment.destination || '—'}
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatMoney(payment.amount)}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(payment.paid_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            statusStyles[getStatusKey(payment.status)] ||
                            'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {formatStatus(payment.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => openPayment(payment)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-100"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                {!loading && !error && filteredPayments.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      {payments.length === 0
                        ? 'No payment records have been registered yet.'
                        : 'No payments match your current search and filters.'}
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      Loading payment records...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {selectedPayment && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedPayment(null)
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="payment-dialog-title"
              className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-700">
                    Payment Details
                  </p>

                  <h2
                    id="payment-dialog-title"
                    className="mt-1 text-xl font-extrabold"
                  >
                    Payment #{selectedPayment.id}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  aria-label="Close payment details"
                  className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              {detailsLoading ? (
                <p className="py-10 text-center text-slate-500">
                  Loading payment details...
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
                Payment details are read-only. The current admin API supports
                listing and viewing payment records but does not provide payment
                update, refund, or deletion endpoints.
              </p>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
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
